"""
Patch untuk nginx-api (10.34.1.1:/opt/nginx-api/app.py)

Cara deploy:
  ssh user@10.34.1.1
  # Lihat top of app.py untuk IDCH_API_KEY dan cara existing DNS A records dibuat
  # Tambahkan route ini ke app.py, sebelum baris `if __name__ == '__main__':`
  # Kemudian: systemctl restart nginx-api

Pastikan variabel IDCH_API_KEY, IDCH_ZONE_ID (atau nama zone) sudah tersedia
persis seperti yang digunakan di route /site/add yang sudah ada.
"""

import os
import requests

IDCH_API_KEY = os.environ.get('IDCH_API_KEY', '')
IDCH_API_BASE = 'https://api.idcloudhost.com/v1'
OPSID_ZONE = 'opsid.web.id'   # Zone yang dikelola OPSID di IDCloudHost
MX_HOST    = 'mail.opsid.web.id'

# ── Helpers IDCloudHost DNS ────────────────────────────────────────────────

def _idch_headers():
    return {'apikey': IDCH_API_KEY, 'Content-Type': 'application/json'}

def _idch_list_records(zone):
    r = requests.get(
        f'{IDCH_API_BASE}/user-resource/dns/{zone}/records',
        headers=_idch_headers(), timeout=10
    )
    r.raise_for_status()
    return r.json()  # [{id, name, type, value, ttl}, ...]

def _idch_add_record(zone, name, rtype, value, ttl=3600):
    """Add DNS record. Idempotent: skip if identical record exists."""
    try:
        existing = _idch_list_records(zone)
        for rec in existing:
            if (rec.get('name','').lower() == name.lower()
                    and rec.get('type','').upper() == rtype.upper()
                    and rec.get('value','') == value):
                return {'ok': True, 'skipped': True, 'id': rec.get('id')}
    except Exception:
        pass  # proceed to create even if list fails

    r = requests.post(
        f'{IDCH_API_BASE}/user-resource/dns/{zone}/records',
        headers=_idch_headers(),
        json={'name': name, 'type': rtype, 'value': value, 'ttl': ttl},
        timeout=10,
    )
    if r.status_code not in (200, 201):
        raise Exception(f'IDCH DNS create {rtype} {name} failed {r.status_code}: {r.text[:200]}')
    return {'ok': True, 'created': True, 'data': r.json()}

# ── Route: POST /site/mail — create mail DNS records for an OPSID subdomain ─

# from flask import request, jsonify  ← already imported in app.py

# @app.route('/site/mail', methods=['POST', 'DELETE'])
def site_mail():
    from flask import request, jsonify

    if request.method == 'DELETE':
        # Existing DELETE handler (already in app.py) — kept as-is
        # This stub is only for the NEW POST handler
        return jsonify({'ok': False, 'error': 'DELETE not changed by this patch'}), 400

    data         = request.json or {}
    domain       = data.get('domain', '').strip().lower()   # e.g. atom.opsid.web.id
    dkim_key     = data.get('dkim_public_key', '')          # full "v=DKIM1; h=sha256; k=rsa; p=..."
    dkim_sel     = data.get('dkim_selector', 'mail')
    mail_domain  = data.get('mail_domain', domain)          # may differ for custom domains

    if not domain:
        return jsonify({'ok': False, 'error': 'domain wajib'}), 400

    # Determine if this is an OPSID subdomain or a custom domain
    is_opsid_subdomain = domain.endswith('.opsid.web.id')

    if not is_opsid_subdomain:
        # Custom domain: DNS is at customer's registrar — we can't auto-create
        return jsonify({
            'ok':      True,
            'skipped': True,
            'reason':  'custom domain — DNS records must be added manually by domain owner',
        })

    # OPSID subdomain: create records in opsid.web.id zone
    # atom.opsid.web.id → subdomain label = "atom"
    subdomain_label = domain.replace('.opsid.web.id', '')

    results = {}
    errors  = []

    # 1. MX record
    try:
        results['mx'] = _idch_add_record(
            OPSID_ZONE, subdomain_label, 'MX', f'10 {MX_HOST}'
        )
    except Exception as e:
        errors.append(f'MX: {e}')

    # 2. SPF TXT record
    try:
        results['spf'] = _idch_add_record(
            OPSID_ZONE, subdomain_label, 'TXT',
            f'v=spf1 a:{MX_HOST} ~all'
        )
    except Exception as e:
        errors.append(f'SPF: {e}')

    # 3. DKIM TXT record
    if dkim_key:
        dkim_name = f'{dkim_sel}._domainkey.{subdomain_label}'
        try:
            results['dkim'] = _idch_add_record(
                OPSID_ZONE, dkim_name, 'TXT', dkim_key
            )
        except Exception as e:
            errors.append(f'DKIM: {e}')

    # 4. DMARC TXT record
    try:
        dmarc_name = f'_dmarc.{subdomain_label}'
        results['dmarc'] = _idch_add_record(
            OPSID_ZONE, dmarc_name, 'TXT',
            'v=DMARC1; p=none; rua=mailto:postmaster@opsid.web.id; adkim=r; aspf=r'
        )
    except Exception as e:
        errors.append(f'DMARC: {e}')

    if errors:
        return jsonify({'ok': False, 'errors': errors, 'partial': results}), 500

    return jsonify({'ok': True, 'domain': domain, 'records': results})


"""
CATATAN DEPLOYMENT:
==================
1. SSH ke 10.34.1.1
2. cat /opt/nginx-api/app.py — lihat bagaimana IDCH_API_KEY didefinisikan
3. Salin fungsi _idch_list_records, _idch_add_record, dan route /site/mail di atas
4. Ganti @app.route decorator dan def:
     @app.route('/site/mail', methods=['POST', 'DELETE'])
     def site_mail():
         if request.method == 'DELETE':
             <existing DELETE logic>
         ... (kode baru di atas)
5. systemctl restart nginx-api
6. Test: curl -X POST http://10.34.1.1:8080/site/mail \\
          -H "Content-Type: application/json" \\
          -d '{"domain":"test-check.opsid.web.id"}'
"""

# OPSID Project Context

## Product

OPSID adalah multi-tenant workspace platform.

Fitur utama:

- Keycloak SSO
- Nextcloud
- SOGo
- Odoo
- White-label tenant
- Custom domain support

## Infrastructure

app-01
- SvelteKit
- PM2
- Portal OPSID

auth.opsid.web.id
- Keycloak

files.opsid.web.id
- Nextcloud

mail.opsid.web.id
- SOGo

edge-01
- nginx-ui
- nginx-api
- Public IP 103.134.152.140

## Current Progress

P0.1 Recent Files
STATUS: DONE

P0.2 Login Experience
STATUS: DONE

P0.3.1 Tenant Provisioning
STATUS: DONE

P0.3.2 Keycloak Redirect URI Sync
STATUS: DONE

P0.3.3 White-label Branding
STATUS: DONE

P0.3.4 SSL Provisioning
STATUS: TODO

## Important Decisions

Custom domain is a first-class feature.

Never assume tenant uses *.opsid.web.id.

Tenant lookup must use:

tenants.domain

not slug.

## Current Tenant Example

Tenant:
1GO

Domain:
workspace.1go.biz.id

Tenant ID:
7

## Current SSL Finding

DNS:
workspace.1go.biz.id -> 103.134.152.140

Port 80:
reachable

Current certificate:
CN=opsid.web.id

Problem:
Custom domain is using OPSID certificate.

Need:
Automatic SSL issuance.

## Rules

Before coding:
1. Audit existing implementation.
2. Create implementation plan.
3. Explain risks.
4. Then implement.

Never:
- hardcode tenant domain
- hardcode Keycloak client ID
- hardcode tenant branding

Always:
- make provisioning idempotent
- preserve backward compatibility
- update CHANGELOG.md
- run build before finishing

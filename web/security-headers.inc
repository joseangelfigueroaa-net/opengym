# Security headers for every response (Trainnery). Included by the server block AND by every
# location that sets its own headers: in nginx, one add_header inside a location drops all the
# ones inherited from the server block, so each such location includes this file again.
#
# CSP: the app loads nothing from other origins (exercise media is served from /img and /gif,
# the API is same-origin), so everything is 'self'. style-src keeps 'unsafe-inline' for the
# style attributes React writes. frame-src 'self' is the hidden print frame (lib/plan-share.js).
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header Strict-Transport-Security "max-age=31536000" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;

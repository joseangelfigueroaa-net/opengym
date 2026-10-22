#!/bin/sh
# Hardens the Trainnery server (Contabo, Ubuntu, Coolify). Run as root ON THE SERVER:
#
#   sh harden-server.sh <your public IP>
#
# What it changes, in an order that cannot lock you out of SSH:
#   1. SSH: keys only (no passwords), root only with a key, 3 tries per connection.
#      It refuses to run unless root already has an authorized key, and tests the config
#      before reloading — keep your current session open until a NEW login works.
#   2. fail2ban for SSH.
#   3. Host firewall (ufw): only 22, 80 and 443 come in.
#   4. Coolify's own ports (8000 panel, 6001/6002 realtime and terminal, 8080 proxy dashboard)
#      only from <your public IP>. Docker publishes those ports past ufw, so this goes in the
#      DOCKER-USER chain, re-applied at every boot by a small systemd unit.
#   5. Automatic security updates.
#
# If your IP changes and the Coolify panel stops loading: SSH in and run
#   sh harden-server.sh <new IP>        (it replaces the old rule)
set -eu

ADMIN_IP="${1:-}"
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
echo "$ADMIN_IP" | grep -Eq '^[0-9]{1,3}(\.[0-9]{1,3}){3}$' || { echo "usage: sh $0 <your public IPv4>"; exit 1; }
[ -s /root/.ssh/authorized_keys ] || { echo "root has no authorized SSH key: add one before disabling passwords"; exit 1; }

echo "1/5 SSH: keys only"
cat > /etc/ssh/sshd_config.d/99-trainnery.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
MaxAuthTries 3
EOF
sshd -t
systemctl reload ssh 2>/dev/null || systemctl reload sshd

echo "2/5 fail2ban"
DEBIAN_FRONTEND=noninteractive apt-get install -y -q fail2ban unattended-upgrades >/dev/null
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban >/dev/null 2>&1
systemctl restart fail2ban

echo "3/5 host firewall"
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "4/5 Coolify ports only from $ADMIN_IP"
cat > /usr/local/sbin/trainnery-docker-fw <<EOF
#!/bin/sh
# Coolify's ports, reachable only from the admin's IP (set by harden-server.sh)
iptables -N TRAINNERY-ADMIN 2>/dev/null || iptables -F TRAINNERY-ADMIN
iptables -C DOCKER-USER -j TRAINNERY-ADMIN 2>/dev/null || iptables -I DOCKER-USER -j TRAINNERY-ADMIN
for port in 8000 6001 6002 8080; do
  iptables -A TRAINNERY-ADMIN -p tcp -m conntrack --ctorigdstport \$port -s $ADMIN_IP -j RETURN
  iptables -A TRAINNERY-ADMIN -p tcp -m conntrack --ctorigdstport \$port -j DROP
done
EOF
chmod 700 /usr/local/sbin/trainnery-docker-fw
cat > /etc/systemd/system/trainnery-docker-fw.service <<'EOF'
[Unit]
Description=Restrict Coolify ports to the admin IP
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/trainnery-docker-fw
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now trainnery-docker-fw >/dev/null 2>&1
systemctl restart trainnery-docker-fw

echo "5/5 automatic security updates"
echo 'APT::Periodic::Update-Package-Lists "1"; APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades

echo
echo "Done. Before closing this session, open a NEW one and check that 'ssh trainnery' still works."
echo "Coolify panel: http://<server>:8000 now answers only to $ADMIN_IP."

---
title: "Linux VPS Hardening: From Zero to Production-Ready in 30 Minutes"
description: "A practical guide to securing a fresh Linux VPS for production workloads. Covers SSH hardening, firewall configuration, kernel tuning, and intrusion detection."
pubDate: 2025-01-14
author: "Hilmall Cloud"
tags:
  - "Linux"
  - "VPS"
  - "Security"
  - "DevOps"
---

You've just provisioned a fresh VPS. It's running a stock Ubuntu or Debian image, and it's wide open to the internet. In the next 30 minutes, we'll transform it into a hardened, production-ready server that can safely run your applications.

This isn't theoretical advice — these are the exact steps we run on every server we deploy, whether it's hosting a blockchain validator, a Docker swarm, or an AI inference endpoint.

## Step 1: Initial Access and User Setup (5 minutes)

First, log in as root and create a non-root user. Running as root is a security anti-pattern that dramatically increases your attack surface.

```bash
# Create user with sudo privileges
adduser deploy
usermod -aG sudo deploy

# Set up SSH keys for the new user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Now, switch to the new user and verify you can sudo:

```bash
su - deploy
sudo whoami  # Should return "root"
```

## Step 2: SSH Hardening (5 minutes)

SSH is your primary attack vector. Secure it immediately.

Edit `/etc/ssh/sshd_config`:

```bash
# Disable root login
PermitRootLogin no

# Disable password authentication (use keys only)
PasswordAuthentication no
PubkeyAuthentication yes

# Change default port (optional but recommended)
Port 2222

# Limit authentication attempts
MaxAuthTries 3
MaxSessions 2

# Disable empty passwords
PermitEmptyPasswords no

# Disable X11 forwarding
X11Forwarding no

# Set idle timeout
ClientAliveInterval 300
ClientAliveCountMax 2
```

Restart SSH:

```bash
sudo systemctl restart sshd
```

**Important**: Before logging out, open a new terminal and verify you can still connect. If you get locked out, you'll need to use your provider's console access.

## Step 3: Firewall Configuration (5 minutes)

UFW (Uncomplicated Firewall) provides a simple interface to iptables:

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (adjust port if you changed it)
sudo ufw allow 2222/tcp

# Allow application ports (examples)
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Enable the firewall
sudo ufw enable

# Verify
sudo ufw status verbose
```

For more complex setups, consider using `nftables` directly or a cloud firewall if your provider offers one.

## Step 4: Automatic Security Updates (3 minutes)

Unattended upgrades ensure you get security patches without manual intervention:

```bash
sudo apt install unattended-upgrades

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades

# Edit configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

Enable automatic reboots if required (optional but recommended for kernel updates):

```bash
# In /etc/apt/apt.conf.d/50unattended-upgrades
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
```

## Step 5: Kernel Hardening (5 minutes)

Create `/etc/sysctl.d/99-hardening.conf`:

```bash
# Network hardening
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# IPv6 hardening (if not using IPv6, disable it entirely)
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Memory protection
kernel.randomize_va_space = 2
kernel.exec-shield = 1

# Restrict kernel logs
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
```

Apply:

```bash
sudo sysctl --system
```

## Step 6: Intrusion Detection (5 minutes)

Install and configure Fail2Ban:

```bash
sudo apt install fail2ban

# Create local configuration
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

Edit `/etc/fail2ban/jail.local`:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
```

Start and enable:

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## Step 7: Audit and Monitoring (2 minutes)

Install auditd for system call auditing:

```bash
sudo apt install auditd

# Basic audit rules
sudo auditctl -w /etc/passwd -p wa -k passwd_changes
sudo auditctl -w /etc/shadow -p wa -k shadow_changes
sudo auditctl -w /etc/sudoers -p wa -k sudoers_changes
```

For centralized logging, consider setting up `rsyslog` to forward logs to a remote server or using a cloud logging service.

## Step 8: Final Verification

Run a quick security audit:

```bash
# Check for listening ports
sudo ss -tlnp

# Check running services
sudo systemctl list-unit-files --state=enabled

# Check for failed services
sudo systemctl --failed

# Review recent logins
last -20
```

## Conclusion

Your VPS is now significantly more secure. The hardening steps we've covered — SSH key-only authentication, firewall rules, automatic updates, kernel hardening, and intrusion detection — form the foundation of production security.

Security is an ongoing process, not a one-time setup. Regularly review your logs, keep your software updated, and stay informed about new vulnerabilities affecting your stack.

For high-value workloads like blockchain validators or financial applications, consider additional measures: VPN-only access, hardware security modules, and multi-factor authentication for all administrative access.

---
title: "Bug Bounty Hunting: A Practical Guide to Finding and Reporting Vulnerabilities"
description: "Learn how to find security vulnerabilities in web applications, APIs, and infrastructure. Covers reconnaissance, exploitation techniques, and responsible disclosure."
pubDate: 2025-01-11
author: "Hilmall Cloud"
tags:
  - "Security"
  - "Bug Bounty"
  - "Penetration Testing"
  - "Web Security"
---

Bug bounty programs offer a legitimate path to earn money by finding security vulnerabilities. This guide covers practical techniques for finding bugs, from initial reconnaissance to writing professional reports.

## Getting Started

### Choosing Programs

Not all bug bounty programs are equal. Focus on:

- **Scope clarity**: Well-defined scope means less wasted effort
- **Payout history**: Check HackerOne or Bugcrowd for average payouts
- **Response time**: Look for programs that respond within days, not weeks

### Setting Up Your Environment

Essential tools for every bug hunter:

```bash
# Subdomain enumeration
sudo apt install subfinder amass

# Port scanning
sudo apt install nmap masscan

# Web fuzzing
sudo apt install ffuf gobuster

# Proxy for manual testing
# Download Burp Suite Community Edition
```

## Reconnaissance

### Subdomain Discovery

Find all subdomains to expand your attack surface:

```bash
# Subfinder
subfinder -d target.com -o subdomains.txt

# Amass (more thorough)
amass enum -passive -d target.com -o amass.txt

# Combine and deduplicate
cat subdomains.txt amass.txt | sort -u > all-subdomains.txt
```

### Port Scanning

Identify running services:

```bash
# Fast scan with masscan
sudo masscan -p1-65535 --rate=1000 -oG masscan.txt <target-ip>

# Detailed scan with nmap
nmap -sV -sC -oN nmap.txt <target-ip>
```

### Technology Fingerprinting

Identify technologies to focus your testing:

```bash
# WhatWeb
whatweb https://target.com

# Wappalyzer CLI
wappalyzer https://target.com
```

## Common Vulnerability Classes

### Injection Flaws

SQL injection remains common. Test all inputs:

```bash
# Basic SQL injection test
curl "https://target.com/api/user?id=1'"

# Use sqlmap for automated testing
sqlmap -u "https://target.com/api/user?id=1" --batch
```

### Cross-Site Scripting (XSS)

Test for reflected and stored XSS:

```html
<!-- Basic test -->
<script>alert(1)</script>

<!-- Bypass filters -->
<img src=x onerror=alert(1)>

<!-- DOM-based -->
"><svg onload=alert(1)>
```

### Server-Side Request Forgery (SSRF)

Test URL parameters that fetch remote resources:

```bash
# Test for SSRF
curl "https://target.com/api/fetch?url=http://169.254.169.254/latest/meta-data/"
```

### Insecure Direct Object References (IDOR)

Test authorization on all object references:

```bash
# Change user ID in request
curl "https://target.com/api/users/123/profile" \
  -H "Authorization: Bearer $TOKEN"

# Try 124, 125, etc.
```

## Exploitation Techniques

### Authentication Bypass

Common techniques:

1. **Password reset poisoning**: Manipulate the reset link host header
2. **JWT attacks**: Weak secrets, algorithm confusion
3. **OAuth misconfiguration**: Redirect URI manipulation

### API Security

Modern applications are API-driven. Test:

- **Rate limiting**: Can you brute-force endpoints?
- **Mass assignment**: Can you set unintended fields?
- **Excessive data exposure**: Are sensitive fields returned?

### File Upload Vulnerabilities

Test file upload functionality:

```bash
# Upload a web shell
curl -F "file=@shell.php" https://target.com/upload

# Try double extensions
shell.php.jpg
shell.php%00.jpg
```

## Writing Professional Reports

A good report gets paid faster. Include:

### Summary

Clear, non-technical description of the issue.

### Impact

What's the worst-case scenario? Be specific:
- "An attacker could access all user passwords"
- "This could lead to full server compromise"

### Steps to Reproduce

Numbered, detailed steps that anyone can follow:

```
1. Navigate to https://target.com/settings
2. Intercept the request with Burp Suite
3. Modify the 'user_id' parameter to 'admin'
4. Observe that admin settings are returned
```

### Proof of Concept

Include screenshots, videos, or working exploit code.

### Remediation

Suggest specific fixes:

```
Implement proper authorization checks on the /settings endpoint
to verify the requesting user owns the requested resource.
```

## Responsible Disclosure

Always follow responsible disclosure:

1. **Report privately**: Never publicly disclose before the vendor responds
2. **Give reasonable time**: 90 days is standard
3. **Don't access user data**: Prove the vulnerability without accessing real user data
4. **Follow program rules**: Read and follow the program's policy

## Note-Taking and Evidence Organization

Serious hunting generates mountains of data — subdomains, endpoints, screenshots, request/response pairs. Without a system you'll lose track and re-test the same paths or, worse, lose the evidence you need when writing the report.

Keep a per-program directory with a running notes file:

```
targets/
└── acme-corp/
    ├── notes.md
    ├── subdomains.txt
    ├── endpoints.txt
    ├── screenshots/
    └── requests/
```

Log every interesting endpoint with a one-line hypothesis: `GET /api/export?user_id= — test IDOR on user_id param`. When you circle back days later, these notes tell you exactly where you left off. Screenshot every finding the moment you see it — applications change, and a vulnerability you found today may be patched tomorrow, leaving you with no proof.

## Building a Testing Methodology

Random poking finds random bugs. A repeatable methodology finds them consistently. Work the application in passes, one vulnerability class per pass:

1. **Map the application**: Browse every feature while proxying through Burp. Build a complete site map before touching anything.
2. **Authentication and session pass**: Test registration, login, password reset, session fixation, and logout.
3. **Authorization pass**: For every object reference, test horizontal and vertical privilege escalation.
4. **Input pass**: Test every parameter for injection — SQL, command, template, and XSS.
5. **Business logic pass**: Test workflows — can you skip a payment step, apply a coupon twice, or order negative quantities?

Business logic bugs are the least crowded space because they can't be found by scanners. Understanding what the application is *supposed* to do is the prerequisite for finding where it fails to enforce it.

## Automating Repetitive Work

Automate the boring parts so your time goes to manual testing where the real bugs hide. A simple recon loop in bash covers most of the early grind:

```bash
#!/bin/bash
DOMAIN=$1
subfinder -d $DOMAIN -silent | sort -u > subs.txt
cat subs.txt | httpx -silent -status-code -title -o live.txt
cat subs.txt | gau --threads 5 >> urls.txt
sort -u urls.txt -o urls.txt
```

Run this nightly against your active programs. When a new subdomain or endpoint appears, diff against yesterday's output — fresh attack surface is where fresh bugs live. Pair this with the VPS setup in our [Linux hardening guide](/blog/linux-vps-hardening-production-ready) to run recon continuously on a cheap server instead of your laptop.

## Common Mistakes to Avoid

New hunters burn out on the same traps:

- **Testing out-of-scope assets**: Read the scope twice. A critical finding on an out-of-scope host pays nothing and can get you banned.
- **Over-relying on scanners**: Scanners find the low-hanging fruit everyone else already reported. Use them for breadth, not depth.
- **Ignoring duplicates**: Most reports are duplicates. When you find something obvious, assume it's known and dig one layer deeper for a variant.
- **Chasing every program**: Depth on two programs beats shallow coverage of twenty.

## Conclusion

Bug bounty hunting requires persistence, creativity, and continuous learning. Start with programs that have clear scope and good payouts, master the common vulnerability classes, and always write professional reports.

The most successful hunters specialize. Pick a vulnerability class or technology stack and become an expert. Deep knowledge beats broad, shallow scanning every time.

Remember: the goal is to make the internet safer. Approach each target with respect, follow the rules, and contribute to the security community.

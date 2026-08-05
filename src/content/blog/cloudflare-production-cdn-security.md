---
title: "Cloudflare for Production: CDN, Security, and Edge Computing"
description: "Master Cloudflare's platform for production applications. Covers CDN optimization, WAF configuration, Workers, and DDoS protection strategies."
pubDate: 2025-01-08
author: "Hilmall Cloud"
tags:
  - "Cloudflare"
  - "CDN"
  - "Security"
  - "Edge Computing"
---

Cloudflare has evolved from a simple CDN into a comprehensive edge computing platform. This guide covers production configurations for security, performance, and reliability.

## DNS Configuration

Cloudflare's DNS is the foundation. Best practices:

### Proxy Everything

Enable the orange cloud (proxy) for all web-facing records:

```
Type    Name    Content             Proxy Status
A       @       203.0.113.10        Proxied
A       www     203.0.113.10        Proxied
CNAME   api     target.com          Proxied
```

Proxied records get DDoS protection, WAF, and CDN caching.

### DNSSEC

Enable DNSSEC for security:

1. Go to DNS > Settings
2. Enable DNSSEC
3. Add DS records to your registrar

## CDN Optimization

### Cache Rules

Configure caching for static assets:

```
Rule: *.css, *.js, *.png, *.jpg, *.woff2
Cache Level: Cache Everything
Edge TTL: 1 month
Browser TTL: 1 week
```

### Cache API

For dynamic content, use the Cache API:

```javascript
// Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    const cache = caches.default;
    const cacheKey = new Request(request.url, request);
    
    // Check cache
    let response = await cache.match(cacheKey);
    if (response) {
      return response;
    }
    
    // Fetch from origin
    response = await fetch(request);
    
    // Cache for 5 minutes
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'public, max-age=300');
    
    response = new Response(response.body, {
      status: response.status,
      headers: headers,
    });
    
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
```

## Security Configuration

### Web Application Firewall (WAF)

Enable managed rules:

1. Go to Security > WAF
2. Enable Cloudflare Managed Ruleset
3. Enable OWASP Core Ruleset

Add custom rules:

```
Rule: Block bad bots
Expression: (http.user_agent contains "badbot") or (http.user_agent contains "scraper")
Action: Block
```

### Rate Limiting

Protect against brute force:

```
Rule: Login rate limit
Expression: http.request.uri.path contains "/login"
Characteristics: IP
Period: 10 seconds
Requests: 5
Action: Challenge
```

### Bot Management

Enable Bot Fight Mode:

1. Go to Security > Bots
2. Enable Bot Fight Mode
3. Configure static resource protection

## Cloudflare Workers

Serverless functions at the edge:

### API Gateway Pattern

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Route to different backends
    if (url.pathname.startsWith('/api/users')) {
      return fetch('https://users-service.internal' + url.pathname);
    }
    
    if (url.pathname.startsWith('/api/orders')) {
      return fetch('https://orders-service.internal' + url.pathname);
    }
    
    return fetch(request);
  },
};
```

### A/B Testing

```javascript
export default {
  async fetch(request) {
    const bucket = Math.random() < 0.5 ? 'a' : 'b';
    const url = new URL(request.url);
    url.hostname = `${bucket}.backend.example.com`;
    
    return fetch(url, request);
  },
};
```

### Request Modification

```javascript
export default {
  async fetch(request) {
    // Add security headers
    const response = await fetch(request);
    const newResponse = new Response(response.body, response);
    
    newResponse.headers.set('X-Frame-Options', 'DENY');
    newResponse.headers.set('X-Content-Type-Options', 'nosniff');
    newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return newResponse;
  },
};
```

## DDoS Protection

Cloudflare's DDoS protection is automatic, but configure these for optimal protection:

### Under Attack Mode

For active attacks, enable "Under Attack Mode":

1. Go to Security > Settings
2. Security Level: I'm Under Attack
3. This adds a JavaScript challenge to all requests

### Advanced DDoS Settings

For L7 protection:

```
Rule: Block POST flood
Expression: http.request.method eq "POST" and not http.request.uri.path contains "/api"
Action: Block
```

## Load Balancing

Distribute traffic across origins:

1. Go to Traffic > Load Balancing
2. Create pool with your origin servers
3. Configure health checks
4. Set up geo-steering if needed

## Argo Smart Routing

Enable Argo for optimized routing:

1. Go to Network > Argo
2. Enable Argo Smart Routing
3. This uses Cloudflare's private network for faster routing

## Workers KV and Durable Objects

For stateful applications:

### Workers KV (Key-Value Store)

```javascript
export default {
  async fetch(request, env) {
    const value = await env.MY_KV.get('key');
    
    if (!value) {
      await env.MY_KV.put('key', 'value', { expirationTtl: 3600 });
    }
    
    return new Response(value);
  },
};
```

### Durable Objects (Strong Consistency)

```javascript
export class Counter {
  constructor(state, env) {
    this.state = state;
  }
  
  async fetch(request) {
    let value = (await this.state.storage.get('count')) || 0;
    value++;
    await this.state.storage.put('count', value);
    
    return new Response(value.toString());
  }
}
```

## Analytics and Monitoring

Enable analytics:

1. Go to Analytics & Logs
2. Enable Web Analytics
3. Configure Logpush for detailed logs

Key metrics to monitor:
- Cache hit ratio (target: >90%)
- Origin response time
- Bandwidth savings
- Threats blocked

## Securing the Origin Server

Putting Cloudflare in front of your site doesn't help if attackers can bypass it and hit your origin directly. If your origin IP is discoverable — and it usually is, through historical DNS records or certificate transparency logs — all your WAF rules are decorative.

Lock the origin down so it only accepts traffic from Cloudflare's IP ranges:

```bash
# Allow only Cloudflare IPs on web ports
for ip in $(curl -s https://www.cloudflare.com/ips-v4); do
  ufw allow from $ip to any port 443 proto tcp
done

# Deny everyone else
ufw deny 443/tcp
```

For stronger guarantees, use **authenticated origin pulls** — Cloudflare presents a client certificate that your origin verifies:

```nginx
ssl_client_certificate /etc/nginx/cloudflare-origin.pem;
ssl_verify_client on;
```

With this in place, a direct request to your origin without Cloudflare's certificate gets rejected at the TLS layer. This is the single most important step most people skip, and it pairs naturally with the firewall discipline in our [Linux VPS hardening guide](/blog/linux-vps-hardening-production-ready).

## Debugging Workers

Workers fail silently if you're not careful — an exception in a fetch handler just returns a 500 to the user. Use `wrangler tail` to stream live logs during development:

```bash
# Watch real-time logs from your Worker
wrangler tail my-worker

# Filter to errors only
wrangler tail my-worker --status error
```

For structured logging in production, push logs to an external service with Logpush, or emit them to your own endpoint from within the Worker. Keep payloads small — every byte you log is a byte processed at the edge, and verbose logging at high request rates adds real cost.

## Managing Cloudflare with Terraform

Clicking through the dashboard doesn't scale beyond one zone. Cloudflare has a first-class Terraform provider, which lets you version-control your DNS records, WAF rules, and page rules alongside the rest of your infrastructure — the same workflow we cover in our [Infrastructure as Code guide](/blog/infrastructure-as-code-terraform-ansible):

```hcl
resource "cloudflare_record" "api" {
  zone_id = var.zone_id
  name    = "api"
  content = "203.0.113.10"
  type    = "A"
  proxied = true
}

resource "cloudflare_ruleset" "waf_custom" {
  zone_id = var.zone_id
  name    = "Custom WAF rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(http.request.uri.path contains \"/.env\")"
    description = "Block env file probes"
  }
}
```

Now a `terraform plan` shows you exactly what changes before anything touches production, and a bad change rolls back with `git revert`.

## Page Rules vs. Cache Rules

Cloudflare has two overlapping systems for controlling behavior: the older Page Rules and the newer Rulesets (Cache Rules, Redirect Rules, Transform Rules). Prefer the newer Rulesets — they're more flexible, better documented, and where Cloudflare is investing. Page Rules still work and some features only exist there, but for new configurations start with Cache Rules for caching behavior and Redirect Rules for URL handling.

A practical Cache Rule for a static site: match on file extension for CSS/JS/images, set Edge TTL to a month, and bypass cache for anything under `/admin`. Keep rules few and explicit — a tangle of overlapping rules becomes impossible to debug when caching misbehaves.

## Conclusion

Cloudflare's platform provides comprehensive edge capabilities — CDN, security, and compute — in a single service. The configurations covered here provide a solid foundation for production deployments.

Start with the security basics (WAF, rate limiting, bot management), then optimize performance (caching, Argo), and finally explore Workers for custom edge logic. Cloudflare's free tier is generous enough to get started, with paid plans unlocking advanced features.

The edge is the future of application delivery. Cloudflare makes it accessible.

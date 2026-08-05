---
title: "Infrastructure as Code: Terraform and Ansible for Production"
description: "Learn how to manage infrastructure with code. Covers Terraform for provisioning and Ansible for configuration management in production environments."
pubDate: 2025-01-06
author: "Hilmall Cloud"
tags:
  - "Infrastructure"
  - "Terraform"
  - "Ansible"
  - "DevOps"
---

Infrastructure as Code (IaC) transforms how we manage servers. Instead of manual configuration, we define infrastructure in code — versioned, reviewable, and repeatable. This guide covers production-grade Terraform and Ansible.

## Terraform: Infrastructure Provisioning

Terraform provisions cloud resources declaratively.

### Project Structure

```
terraform/
├── environments/
│   ├── production/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── staging/
├── modules/
│   ├── vpc/
│   ├── compute/
│   └── database/
└── global/
```

### Core Concepts

**Providers** — Cloud platforms:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.region
}
```

**Resources** — Infrastructure components:

```hcl
resource "aws_instance" "web" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id              = module.vpc.public_subnets[0]
  
  tags = {
    Name        = "web-server"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
```

**Modules** — Reusable components:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
  
  name = "my-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  
  enable_nat_gateway = true
  enable_vpn_gateway = false
}
```

### Best Practices

**State Management**:

```bash
# Use remote state
terraform init -backend-config="bucket=my-state"

# Enable state locking
dynamodb_table = "terraform-locks"
```

**Variable Management**:

```hcl
# variables.tf
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
  
  validation {
    condition     = contains(["t3.micro", "t3.small", "t3.medium"], var.instance_type)
    error_message = "Invalid instance type."
  }
}

# terraform.tfvars (gitignored for secrets)
instance_type = "t3.small"
```

**Workspaces for Environments**:

```bash
terraform workspace new production
terraform workspace select production
terraform apply
```

## Ansible: Configuration Management

Ansible configures servers after provisioning.

### Inventory

```ini
# inventory/production.ini
[webservers]
web1.example.com
web2.example.com

[dbservers]
db1.example.com
```

Add group variables in a separate vars section:

```ini
# All hosts inherit these variables
# (the all-colon-vars group header)
ansible_user=deploy
ansible_ssh_private_key_file=~/.ssh/deploy_key
```

Define group variables in `group_vars/all.yml` instead of inline:

```yaml
# group_vars/all.yml
ansible_user: deploy
ansible_ssh_private_key_file: ~/.ssh/deploy_key
```

### Playbooks

```yaml
# site.yml
---
- name: Configure web servers
  hosts: webservers
  become: yes
  
  vars:
    app_version: "1.2.3"
  
  roles:
    - common
    - nginx
    - app

- name: Configure database servers
  hosts: dbservers
  become: yes
  
  roles:
    - common
    - postgresql
```

### Roles

Roles organize tasks:

```
roles/
└── nginx/
    ├── tasks/
    │   └── main.yml
    ├── handlers/
    │   └── main.yml
    ├── templates/
    │   └── nginx.conf.j2
    └── vars/
        └── main.yml
```

**tasks/main.yml**:

```yaml
---
- name: Install nginx
  apt:
    name: nginx
    state: present
    update_cache: yes

- name: Configure nginx
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Restart nginx

- name: Ensure nginx is running
  service:
    name: nginx
    state: started
    enabled: yes
```

**handlers/main.yml**:

```yaml
---
- name: Restart nginx
  service:
    name: nginx
    state: restarted
```

### Templates

```nginx
# templates/nginx.conf.j2
server {
    listen 80;
    server_name {{ server_name }};
    
    location / {
        proxy_pass http://localhost:{{ app_port }};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Vault for Secrets

```bash
# Encrypt secrets
ansible-vault encrypt group_vars/all/vault.yml

# Edit encrypted file
ansible-vault edit group_vars/all/vault.yml

# Run playbook with vault
ansible-playbook site.yml --ask-vault-pass
```

## Integration: Terraform + Ansible

Terraform provisions, Ansible configures:

```hcl
# terraform/main.tf
resource "aws_instance" "web" {
  # ... provisioning ...
  
  provisioner "local-exec" {
    command = <<-EOT
      sleep 30
      ansible-playbook -i '${self.public_ip},' \
        --private-key ~/.ssh/deploy_key \
        ../ansible/webserver.yml
    EOT
  }
}
```

Or use dynamic inventory:

```python
#!/usr/bin/env python3
# dynamic_inventory.py
import json
import subprocess

def get_inventory():
    output = subprocess.check_output(
        ["terraform", "output", "-json"],
        cwd="../terraform"
    )
    data = json.loads(output)
    
    return {
        "webservers": {
            "hosts": data["web_ips"]["value"]
        }
    }

if __name__ == "__main__":
    print(json.dumps(get_inventory()))
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/infrastructure.yml
name: Infrastructure

on:
  push:
    branches: [main]
    paths: ['terraform/**', 'ansible/**']

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Init
        run: terraform init
        working-directory: terraform/environments/production
      
      - name: Terraform Plan
        run: terraform plan
        working-directory: terraform/environments/production
      
      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply -auto-approve
        working-directory: terraform/environments/production
  
  ansible:
    needs: terraform
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Ansible
        run: |
          ansible-playbook -i inventory/production.ini site.yml
        working-directory: ansible
```

## Best Practices Summary

**Terraform**:
- Use remote state with locking
- Modularize everything
- Use workspaces or directories for environments
- Never commit secrets
- Plan before applying

**Ansible**:
- Use roles for organization
- Encrypt secrets with Vault
- Make playbooks idempotent
- Use handlers for service restarts
- Test with `--check` mode

**Both**:
- Version control everything
- Code review all changes
- Automate testing
- Document your modules and roles

## Conclusion

Infrastructure as Code transforms operations from manual toil to automated, repeatable processes. Terraform provisions, Ansible configures, and together they enable infrastructure that's versioned, reviewable, and reliable.

Start small — automate one server, one environment. Build confidence, then expand. The goal is infrastructure you can rebuild from code in minutes, not days.

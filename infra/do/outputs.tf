output "public_ip" {
  value = digitalocean_droplet.main.ipv4_address
}

output "ssh_command" {
  value = "ssh root@${digitalocean_droplet.main.ipv4_address}"
}

output "deploy_command" {
  value = "./deploy.sh root@${digitalocean_droplet.main.ipv4_address}"
}

output "next_steps" {
  value = <<-EOT
    1. Point your domain A record to: ${digitalocean_droplet.main.ipv4_address}
    2. SSH in and fill /root/drawing-mcp.env with real values
    3. scp Caddyfile root@${digitalocean_droplet.main.ipv4_address}:/etc/caddy/Caddyfile
    4. SSH in: sudo systemctl restart caddy
    5. ./deploy.sh root@${digitalocean_droplet.main.ipv4_address}
  EOT
}

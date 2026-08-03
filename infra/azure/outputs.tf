output "public_ip" {
  value = azurerm_public_ip.main.ip_address
}

output "ssh_command" {
  value = "ssh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "deploy_command" {
  value = "./deploy.sh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "next_steps" {
  value = <<-EOT
    1. Point your domain A record to: ${azurerm_public_ip.main.ip_address}
    2. SSH in and fill in /root/drawing-mcp.env
    3. scp Caddyfile ${var.admin_username}@${azurerm_public_ip.main.ip_address}:/etc/caddy/Caddyfile
    4. SSH in: sudo systemctl restart caddy
    5. ./deploy.sh ${var.admin_username}@${azurerm_public_ip.main.ip_address}
  EOT
}

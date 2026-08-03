data "digitalocean_ssh_key" "main" {
  name = var.ssh_key_name
}

resource "digitalocean_firewall" "main" {
  name        = "${var.droplet_name}-fw"
  droplet_ids = [digitalocean_droplet.main.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = [var.allowed_ssh_cidr]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

resource "digitalocean_droplet" "main" {
  name      = var.droplet_name
  region    = var.region
  size      = var.droplet_size
  image     = "ubuntu-24-04-x64"
  ssh_keys  = [data.digitalocean_ssh_key.main.id]
  user_data = file("${path.module}/cloud-init.yml")
  tags      = ["drawing-mcp", "production"]
}

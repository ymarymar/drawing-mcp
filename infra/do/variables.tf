variable "do_token" {
  description = "DigitalOcean API token."
  type        = string
  sensitive   = true
}

variable "region" {
  type    = string
  default = "ams3"
}

variable "droplet_size" {
  type    = string
  default = "s-1vcpu-1gb"
}

variable "droplet_name" {
  type    = string
  default = "drawing-mcp"
}

variable "ssh_key_name" {
  description = "Name of SSH key already in your DO account."
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "Your IP in CIDR notation."
  type        = string
}

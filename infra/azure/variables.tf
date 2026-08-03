variable "location" {
  description = "Azure region. northeurope = Ireland, westeurope = Netherlands."
  type        = string
  default     = "northeurope"
}

variable "resource_group_name" {
  type    = string
  default = "drawing-mcp-rg"
}

variable "vm_name" {
  type    = string
  default = "drawing-mcp-vm"
}

variable "vm_size" {
  type    = string
  default = "Standard_B1s"
}

variable "admin_username" {
  type    = string
  default = "azureuser"
}

variable "ssh_public_key_path" {
  type    = string
  default = "~/.ssh/id_ed25519.pub"
}

variable "allowed_ssh_cidr" {
  description = "Your IP in CIDR notation. curl ifconfig.me then append /32"
  type        = string
}

variable "ubuntu_version" {
  type    = string
  default = "24_04-lts-gen2"
}

variable "disk_size_gb" {
  type    = number
  default = 30
}

variable "tags" {
  type = map(string)
  default = {
    project     = "drawing-mcp"
    environment = "production"
    managed_by  = "opentofu"
  }
}

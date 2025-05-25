resource "aws_ecrpublic_repository" "app" {
  repository_name = var.repository_name
}

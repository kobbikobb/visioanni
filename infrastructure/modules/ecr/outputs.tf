output "repository_uri" {
  description = "The URI of the public repository"
  value       = aws_ecrpublic_repository.app.repository_uri
}

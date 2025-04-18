module "ecr" {
  source          = "./modules/ecr"
  repository_name = "visioanni"
}

module "iam" {
  source              = "./modules/iam"
  execution_role_name = "ecsTaskExecutionRole"
}

module "vpc" {
  source              = "./modules/vpc"
  vpc_cidr            = "10.0.0.0/16"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}

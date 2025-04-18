module "ecr" {
  source          = "./modules/ecr"
  repository_name = "visioanni"
}

module "ecs" {
  source = "./modules/ecs"
}

module "iam" {
  source              = "./modules/iam"
  execution_role_name = "ecsTaskExecutionRole"
}


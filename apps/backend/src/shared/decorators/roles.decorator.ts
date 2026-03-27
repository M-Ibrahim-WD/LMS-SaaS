import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "../types/auth.types";

export const Roles = (...roles: UserRole[]) => SetMetadata("roles", roles);

import { SetMetadata } from "@nestjs/common";

export const REQUIRE_TENANT_KEY = "requireTenant";
export const RequireTenant = (required = true) => SetMetadata(REQUIRE_TENANT_KEY, required);

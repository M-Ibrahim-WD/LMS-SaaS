import { Controller, Get } from "@nestjs/common";
import { HomepageService } from "./homepage.service";

@Controller("homepage")
export class HomepagePublicController {
  constructor(private readonly homepageService: HomepageService) {}

  @Get("published")
  getPublishedHomepage() {
    return this.homepageService.getPublishedHomepage();
  }
}

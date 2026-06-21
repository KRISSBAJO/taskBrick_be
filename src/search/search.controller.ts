import { Controller, Get, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('status')
  @Version('1')
  @ApiOperation({ summary: 'Search module readiness check' })
  status() {
    return this.searchService.status();
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search across tenant projects, tasks, files, people, teams, workspaces, and messages' })
  @ApiOkResponse({ description: 'Ranked command-center search results' })
  globalSearch(@CurrentUser() user: AuthenticatedUser, @Query() query: GlobalSearchQueryDto) {
    return this.searchService.globalSearch(user, query);
  }
}

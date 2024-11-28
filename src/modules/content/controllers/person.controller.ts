import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/user/guards/jwt-auth.guard';
import { AdminGuard } from '@modules/user/guards/admin.guard';
import { PersonService } from '../services/person.service';
import { CreatePersonDto, UpdatePersonDto, PersonListDto } from '../dto/person.dto';

@ApiTags('人员管理')
@Controller('persons')
export class PersonController {
  constructor(private readonly personService: PersonService) {}

  @Get()
  @ApiOperation({ summary: '获取人员列表' })
  async findAll(@Query() query: PersonListDto) {
    return this.personService.findAll(query);
  }

  @Get('actors')
  @ApiOperation({ summary: '获取演员列表' })
  async findActors(@Query('limit') limit: number = 100) {
    return this.personService.findActors(limit);
  }

  @Get('directors')
  @ApiOperation({ summary: '获取导演列表' })
  async findDirectors(@Query('limit') limit: number = 100) {
    return this.personService.findDirectors(limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建人员' })
  async create(@Body() createPersonDto: CreatePersonDto) {
    return this.personService.create(createPersonDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新人员' })
  async update(@Param('id') id: string, @Body() updatePersonDto: UpdatePersonDto) {
    return this.personService.update(id, updatePersonDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除人员' })
  async remove(@Param('id') id: string) {
    return this.personService.remove(id);
  }
} 
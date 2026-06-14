import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Permissions, PermissionsGuard } from '@app/auth';
import { CreateUserDto } from './dto/create-user.dto';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { CurrentUser } from '@app/auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions('user.view')
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  // --- Profile & Addresses (for the currently logged in user) ---
  @Get('me')
  getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Put('me/profile')
  updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/addresses')
  getAddresses(@CurrentUser() user: any) {
    return this.usersService.getAddresses(user.id);
  }

  @Post('me/addresses')
  createAddress(
    @CurrentUser() user: any,
    @Body() dto: CreateUserAddressDto,
  ) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Put('me/addresses/:id')
  updateAddress(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Patch('me/addresses/:id/default')
  setDefaultAddress(
    @CurrentUser() user: any,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.usersService.setDefaultAddress(user.id, id);
  }
  // -----------------------------------------------------------------

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('user.view')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions('user.create')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('user.update')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Post(':id/reset-password')
  @UseGuards(PermissionsGuard)
  @Permissions('user.update')
  resetPassword(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.usersService.resetPassword(id, dto);
  }

  @Post(':id/roles')
  @UseGuards(PermissionsGuard)
  @Permissions('user.update')
  assignRoles(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    return this.usersService.assignRoles(id, dto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions('user.delete')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.softDelete(id);
  }
}

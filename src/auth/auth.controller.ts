import { Controller, Post, Body, Get, UseGuards, Req, SetMetadata, Param, ParseUUIDPipe, Patch, Delete, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginUserDto, CreateUserDto, UpdateUserDto } from './dto';
import { AuthGuard } from '@nestjs/passport';
import { GetUser } from './decorators/get-user.decorator';
import { User } from './entities/user.entity';
import { GetRawHeaders } from './decorators/get-rawHeaders.decorator';
import { UserRoleGuard } from './guards/user-role.guard';
import { RoleProtected } from './decorators/role-protected.decorator';
import { ValidRoles } from './interface/valid-roles';
import { Auth } from './decorators/auth.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @Auth(ValidRoles.admin)
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.create(createUserDto);
  }

  @Post('login')
  loginUser(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Get('check')
  @Auth()
  checkAuthStatus(
    @GetUser() user: User
  ) {
    return this.authService.cheAuthStatus(user);
  }

  @Get('usuarios')
  @Auth(ValidRoles.admin, ValidRoles.user)
  getUsers() {
    return this.authService.getUsers();
  }

  @Get('usuarios/:id')
  @Auth(ValidRoles.admin)
  getUserById(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.authService.getUserById(id);
  }

  @Patch('usuarios/:id')
  @Auth(ValidRoles.admin)
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto
  ) {
    return this.authService.updateUser(id, updateUserDto);
  }


  @Patch('deactivate/:id')
  @Auth(ValidRoles.admin)
  deactivateUser(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.authService.deactivateUser(id);
  }

  @Delete('usuario/:id')
  @Auth(ValidRoles.admin)
  deleteUser(
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.authService.deleteUser(id);
  }
}

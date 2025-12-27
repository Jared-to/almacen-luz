import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { META_ROLES } from "../decorators/role-protected.decorator";


@Injectable()
export class UserRoleGuard implements CanActivate{
  constructor(
    private readonly reflectos:Reflector
  ){}
  canActivate(
    context: ExecutionContext
  ): boolean | Promise<boolean> | Observable<boolean> {
    

    const validRoles:string[]=this.reflectos.get(META_ROLES,context.getHandler())

    if(!validRoles) return true;
    if(validRoles.length===0) return true;

    const req=context.switchToHttp().getRequest();

    const user=req.user;

    if (!user) {
      throw new BadRequestException("Usuario no encontrado");
    }

    for(const role of user.roles){

      if (validRoles.includes(role)) {
        return true;
      }
    }

    throw new ForbiddenException(`El usuario ${user.fullName} no tiene ese permiso`);

  }

}
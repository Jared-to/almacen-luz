
import { PassportStrategy } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Repository } from "typeorm";

import { User } from "../entities/user.entity";
import { JwtPayload } from "../interface/jwt-payload.interface";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){
 
  constructor(
    @InjectRepository(User)
    private readonly userReposity:Repository<User>,

    configService:ConfigService
  ){
    super({
      secretOrKey: configService.get<string>('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }
  
  async validate(payload: JwtPayload): Promise<User>{

    const  { id } = payload;

    const user = await this.userReposity.findOneBy({id});

    if (!user) {
      throw new UnauthorizedException("Token no valido");
    }

    if (!user.isActive) {
      throw new UnauthorizedException('El usuario no esta activado')
    }

    return user;
  }

}
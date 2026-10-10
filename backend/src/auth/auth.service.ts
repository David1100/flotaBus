import { Injectable, UnauthorizedException } from '@nestjs/common'; import { JwtService } from '@nestjs/jwt'; import { PrismaService } from '../prisma/prisma.service'; import * as argon2 from 'argon2';
@Injectable() export class AuthService { constructor(private db:PrismaService, private jwt:JwtService){}
 async login(username:string,password:string){ const user=await this.db.user.findUnique({where:{username}}); if(!user||!user.isActive||!(await argon2.verify(user.passwordHash,password))) throw new UnauthorizedException('Invalid credentials'); return {token:await this.jwt.signAsync({sub:user.id,rol:user.rol,username:user.username}), user:this.safe(user)}; }
 safe(u:any){const {passwordHash,...safe}=u; return safe;} async me(id:number){const u=await this.db.user.findUnique({where:{id}}); if(!u||!u.isActive) throw new UnauthorizedException('Invalid session'); return this.safe(u);}
}

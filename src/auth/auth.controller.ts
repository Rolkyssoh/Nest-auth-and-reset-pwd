import { BadRequestException, Body, ClassSerializerInterceptor, Controller, Get, Post, Req, Res, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { AuthInterceptor } from './auth.interceptor';

@UseInterceptors(ClassSerializerInterceptor)
@Controller()
export class AuthController {
    constructor(
        private authService: AuthService,
        private jwtService: JwtService
    ) { }

    @Post('register')
    async register(@Body() user: RegisterDto) {
        if (user.password !== user.password_confirm) {
            throw new BadRequestException('Passwords do not match');
        }

        const salt = await bcrypt.genSalt();
        user.password = await bcrypt.hash(user.password, salt);

        return this.authService.create(user)
    }

    @Post('login')
    async login(
        @Body('email') email: string,
        @Body('password') password: string,
        @Res({ passthrough: true }) response: Response
    ) {
        const user = await this.authService.findOneBy({ email });

        if (!user) {
            throw new BadRequestException('Email does not exist!!');
        }

        if (!await bcrypt.compare(password, user.password)) {
            throw new BadRequestException('Invalid credentials');
        }

        const jwt = await this.jwtService.signAsync({ id: user.id });

        response.cookie('jwt', jwt, { httpOnly: true })

        return {
            user
        }
    }

    @UseInterceptors(AuthInterceptor)
    @Get('user')
    async user(@Req() request: Request) {
        const cookie = request.cookies['jwt'];

        const data = await this.jwtService.verifyAsync(cookie);

        return this.authService.findOneBy({ id: data['id'] });

    }

    @UseInterceptors(AuthInterceptor)
    @Post('logout')
    async logout(
        @Res({ passthrough: true }) response: Response
    ) {
        response.clearCookie('jwt');

        return {
            message: 'Success!'
        }
    }
}

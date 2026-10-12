import { Body, Controller, DefaultValuePipe, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../auth/csrf.guard';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles('ADMINISTRADOR', 'CHOFER')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get('inbox')
  inbox(@Req() req: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.service.inbox(req.user.id, Math.max(1, page), Math.min(100, Math.max(1, limit)));
  }

  @Get('sent')
  sent(@Req() req: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.service.sent(req.user.id, Math.max(1, page), Math.min(100, Math.max(1, limit)));
  }

  @Post()
  send(@Req() req: any, @Body() dto: SendMessageDto) {
    return this.service.send(req.user.id, dto);
  }

  @Patch(':id/read')
  markRead(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.markRead(req.user.id, id);
  }
}

import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyResetCodeDto {
  @IsEmail({}, { message: 'Email inválido' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code: string;
}

import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { LocationModule } from './location/location.module';
import { BookingModule } from './booking/booking.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentModule } from './department/department.module';
import { AuthModule } from './auth/auth.module';
import { UniqueValidator } from './common/unique.validator';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST'),
        port: Number(config.get('DB_PORT')),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get('DB_SYNC') === 'true',
      }),
    }),
    AuthModule,
    UserModule,
    DepartmentModule,
    LocationModule,
    BookingModule,
  ],
  providers: [UniqueValidator],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import {
  Location,
  LocationSchema,
  SafeZone,
  SafeZoneSchema,
  LocationHistory,
  LocationHistorySchema,
  DailyRoute,
  DailyRouteSchema,
  LocationSettings,
  LocationSettingsSchema,
} from './schemas/location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Location.name, schema: LocationSchema },
      { name: SafeZone.name, schema: SafeZoneSchema },
      { name: LocationHistory.name, schema: LocationHistorySchema },
      { name: DailyRoute.name, schema: DailyRouteSchema },
      { name: LocationSettings.name, schema: LocationSettingsSchema },
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}

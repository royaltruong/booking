import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { CreateLocationScheduleDto } from '../location/dto/location-schedule.dto';

/**
 * Class-validator constraint that ensures all dayOfWeek values
 * in a schedule array are unique (no duplicate days).
 */
@ValidatorConstraint({ name: 'UniqueDayOfWeek' })
export class UniqueDayOfWeekValidator implements ValidatorConstraintInterface {
  /**
   * Returns true if every schedule in the array has a distinct dayOfWeek value.
   * @param schedules - Array of schedule DTOs to validate
   */
  validate(schedules: CreateLocationScheduleDto[]) {
    if (!Array.isArray(schedules)) {
      return false;
    }
    const days = schedules.map((s) => s.dayOfWeek);
    return new Set(days).size === days.length;
  }

  defaultMessage() {
    return 'dayOfWeek values must be unique';
  }
}

import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Converts a time string in H:mm or HH:mm format to total minutes since midnight.
 * @param time - Time string (e.g. "9:30" or "09:30")
 * @returns Total minutes from 00:00
 */
export function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(':').map(Number);

  return hour * 60 + minute;
}

interface ScheduleTime {
  openTime?: string;
  closeTime?: string;
}

/**
 * Class-validator decorator that asserts the decorated time property
 * is strictly before another time property on the same object.
 * @param property - Name of the "end time" property to compare against (e.g. 'closeTime')
 * @param validationOptions - Optional class-validator options
 */
export function IsBefore(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isBefore',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          const obj = args.object as ScheduleTime;
          const relatedValue = obj[relatedProperty as keyof ScheduleTime];

          if (!value || !relatedValue) {
            return true;
          }

          return timeToMinutes(value) < timeToMinutes(relatedValue);
        },
      },
    });
  };
}

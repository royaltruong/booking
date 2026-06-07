import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsAfterAndSameDay(
  compareProperty: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAfterAndSameDay',
      target: object.constructor,
      propertyName,
      constraints: [compareProperty],
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const [compareProperty] = args.constraints as [string];
          const compareValue = (args.object as Record<string, string>)[
            compareProperty
          ];
          const start = new Date(compareValue);
          const end = new Date(value);

          return (
            end > start &&
            start.getFullYear() === end.getFullYear() &&
            start.getMonth() === end.getMonth() &&
            start.getDate() === end.getDate()
          );
        },

        defaultMessage(args: ValidationArguments) {
          const [compareProperty] = args.constraints as [string];
          return `${args.property} must be after ${compareProperty} and both times must be on the same day`;
        },
      },
    });
  };
}

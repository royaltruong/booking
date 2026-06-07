import { registerDecorator, ValidationOptions } from 'class-validator';
import { UniqueValidator } from './unique.validator';

/**
 * Property decorator that validates the value is unique in the specified
 * entity column by delegating to {@link UniqueValidator}.
 * @param entity - The TypeORM entity class to query
 * @param field - The column name to check for uniqueness
 * @param validationOptions - Optional class-validator options
 */
export function IsUnique(
  entity: object,
  field: string,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [entity, field],
      validator: UniqueValidator,
    });
  };
}

import { Injectable } from '@nestjs/common';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';

/**
 * Async class-validator constraint that checks a value does not already
 * exist in the database column specified by the {@link IsUnique} decorator.
 */
@Injectable()
@ValidatorConstraint({ async: true })
export class UniqueValidator implements ValidatorConstraintInterface {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Returns true if no row with the given value exists in the target column.
   * @param value - The field value to check
   * @param args - Validation context; constraints = [EntityClass, fieldName]
   */
  async validate(value: unknown, args: ValidationArguments): Promise<boolean> {
    const [entity, field] = args.constraints as [
      EntityTarget<ObjectLiteral>,
      string,
    ];

    const repository = this.dataSource.getRepository(entity);
    const exists = await repository.exists({
      where: {
        [field]: value,
      },
    });

    return !exists;
  }

  defaultMessage(args: ValidationArguments): string {
    const [, field] = args.constraints as [EntityTarget<ObjectLiteral>, string];
    return `${field} already exists`;
  }
}

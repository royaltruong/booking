import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1780824079424 implements MigrationInterface {
    name = 'Migration1780824079424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "location_schedule" ("id" SERIAL NOT NULL, "dayOfWeek" integer NOT NULL, "openTime" TIME NOT NULL, "closeTime" TIME NOT NULL, "location_id" integer, CONSTRAINT "PK_afc536681b0a7bd142972da774a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "location" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "capacity" integer NOT NULL DEFAULT '0', "isRoom" boolean NOT NULL DEFAULT false, "isUsing" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, "parentId" integer, "departmentId" integer, CONSTRAINT "PK_876d7bdba03c72251ec4c2dc827" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "department" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_471da4b90e96c1ebe0af221e07b" UNIQUE ("name"), CONSTRAINT "PK_9a2213262c1593bffb581e382f5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" SERIAL NOT NULL, "username" character varying NOT NULL, "fullname" character varying NOT NULL, "password" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "departmentId" integer, CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "booking" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "capacity" integer NOT NULL, "bookingTime" TIMESTAMP WITH TIME ZONE NOT NULL, "returnTime" TIMESTAMP WITH TIME ZONE NOT NULL, "isFinish" boolean NOT NULL DEFAULT false, "userId" integer, "locationId" integer, CONSTRAINT "PK_49171efc69702ed84c812f33540" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "location_closure" ("id_ancestor" integer NOT NULL, "id_descendant" integer NOT NULL, CONSTRAINT "PK_00ac59b131aad339016d90861ad" PRIMARY KEY ("id_ancestor", "id_descendant"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e1037326a0bb15cc0f85398749" ON "location_closure"  ("id_ancestor") `);
        await queryRunner.query(`CREATE INDEX "IDX_5838ab81959369ff6f06c70bea" ON "location_closure"  ("id_descendant") `);
        await queryRunner.query(`ALTER TABLE "location_schedule" ADD CONSTRAINT "FK_ea654178b62c0d3e8cf8eec312b" FOREIGN KEY ("location_id") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "location" ADD CONSTRAINT "FK_9123571b1f7aadc5ee8a6f3f152" FOREIGN KEY ("parentId") REFERENCES "location"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "location" ADD CONSTRAINT "FK_1fb4e06336853c384bb1dc565f8" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_3d6915a33798152a079997cad28" FOREIGN KEY ("departmentId") REFERENCES "department"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "booking" ADD CONSTRAINT "FK_336b3f4a235460dc93645fbf222" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "booking" ADD CONSTRAINT "FK_fb5dea75235b6264913bef5383c" FOREIGN KEY ("locationId") REFERENCES "location"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "location_closure" ADD CONSTRAINT "FK_e1037326a0bb15cc0f853987490" FOREIGN KEY ("id_ancestor") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "location_closure" ADD CONSTRAINT "FK_5838ab81959369ff6f06c70bea7" FOREIGN KEY ("id_descendant") REFERENCES "location"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "location_closure" DROP CONSTRAINT "FK_5838ab81959369ff6f06c70bea7"`);
        await queryRunner.query(`ALTER TABLE "location_closure" DROP CONSTRAINT "FK_e1037326a0bb15cc0f853987490"`);
        await queryRunner.query(`ALTER TABLE "booking" DROP CONSTRAINT "FK_fb5dea75235b6264913bef5383c"`);
        await queryRunner.query(`ALTER TABLE "booking" DROP CONSTRAINT "FK_336b3f4a235460dc93645fbf222"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_3d6915a33798152a079997cad28"`);
        await queryRunner.query(`ALTER TABLE "location" DROP CONSTRAINT "FK_1fb4e06336853c384bb1dc565f8"`);
        await queryRunner.query(`ALTER TABLE "location" DROP CONSTRAINT "FK_9123571b1f7aadc5ee8a6f3f152"`);
        await queryRunner.query(`ALTER TABLE "location_schedule" DROP CONSTRAINT "FK_ea654178b62c0d3e8cf8eec312b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5838ab81959369ff6f06c70bea"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e1037326a0bb15cc0f85398749"`);
        await queryRunner.query(`DROP TABLE "location_closure"`);
        await queryRunner.query(`DROP TABLE "booking"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "department"`);
        await queryRunner.query(`DROP TABLE "location"`);
        await queryRunner.query(`DROP TABLE "location_schedule"`);
    }

}

import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket
    const importBucket = new s3.Bucket(this, "import-bucket");
  }
}

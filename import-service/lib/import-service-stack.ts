import * as cdk from 'aws-cdk-lib/core';
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { RestApi, LambdaIntegration, Cors } from "aws-cdk-lib/aws-apigateway";
import { S3EventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { EventType } from "aws-cdk-lib/aws-s3";
import { Construct } from 'constructs';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket
    const importBucket = new Bucket(this, "import-bucket", {
      cors: [
        {
          allowedMethods: [HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    const nodeJsFunctionProps: NodejsFunctionProps = {
      environment: {
        IMPORT_BUCKET_NAME: importBucket.bucketName,
      },
      runtime: Runtime.NODEJS_22_X,
    }

    const importProductsFile = new NodejsFunction(this, "importProductsFile", {
      entry: "lambda/importProductsFile.ts",
      handler: "importProductsFile",
      ...nodeJsFunctionProps,
    });

    const importApi = new RestApi(this, "ImportApi", {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'OPTIONS'],
      }
    });
    const importResource = importApi.root.addResource("import");
    importResource.addMethod("GET", new LambdaIntegration(importProductsFile), {
      requestParameters: {
        "method.request.querystring.name": true,
      },
    });

    importBucket.grantPut(importProductsFile);

    
    const importFileParser = new NodejsFunction(this, "importFileParser", {
      entry: "lambda/importFileParser.ts",
      handler: "importFileParser",
      ...nodeJsFunctionProps,
    });

    importBucket.grantReadWrite(importFileParser);

    importFileParser.addEventSource(
      new S3EventSource(importBucket, {
        events: [EventType.OBJECT_CREATED],
        filters: [
          { prefix: "uploaded/" }
        ],
      })
    );
  }
}

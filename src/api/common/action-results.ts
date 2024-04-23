export type HeaderObject = {[key:string]: string };

export interface Result {
  statusCode: number;
  headers: HeaderObject;
  body: string;
}

export class ActionResults {
  static Response(data:any, statusCode:number= 500){
    let result : Result = { 
        statusCode: statusCode,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data, null, 2),
      };

      return result;
  }

  static Success(data:any){
    return this.Response(data, 200);
  }

  static BadRequest(data: any){
    return this.Response(data, 400);
  }

  static UnAuthorized(data: any){
    return this.Response(data, 401);
  }

  static Forbiden(data: any){
    return this.Response(data, 403);
  }

  static InternalServerError(data: any){
    return this.Response(data, 500);
  }
}
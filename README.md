# nut-ioc
a simple, lightweight and fast IoC Container Framework

## NPM link

https://www.npmjs.com/package/nut-ioc

nut-ioc injects dependencies run-time so that developers don't need to require modules.

Developers can implement in their codes following OOP basics, principles, patterns and concepts and probably more than that :)

- Separation of Concern(SoC)
- Single Responsibility Principle(SRP)
- Open Closed Principle
- Dipendency Inversion(Injection) Principle(DIP)
- Chain of Responsibility Pattern
- Aspect Oriented Programming

## Installing nut-ioc with npm

```shell script
npm i nut-ioc
```

## Demo GitHub Repository for TypeScript

README file is inside the following repository.

[https://github.com/nodejs-projects-kenanhancer/nut-ioc-typescript-simple-demo](https://github.com/nodejs-projects-kenanhancer/nut-ioc-typescript-simple-demo)


## Demo GitHub Repository for CommonJS

You can find different usages of nut-ioc framework in separate branchs.

[https://github.com/nodejs-projects-kenanhancer/nut-ioc-basic-demo.git](https://github.com/nodejs-projects-kenanhancer/nut-ioc-basic-demo.git)

Branch list |
------------------------------------------------------ |
load-dependencies-with-dependencyPath |
load-dependencies-with-dependencyPath-and_dynamically |
load-dependencies-with-different-loaders |
load-dependencies-with-interceptors |
load-dependencies-with-new-loaders-and-filters |
load-dependencies-with-programatic-notation |
nut-swagger-usage |

## Real life Example

This example code is very simple. But, developers never have this kind of simple scenario in real life project.

### Classic code

Suppose that we have greeting service like below. This code example is very usual in Node.js world.

**`helper.js`**
```js
const helper = {
  getFullName: ({firstName, lastName})=>{
    return `${firstName} ${lastName}`;
  }
};

module.exports = helper;
```


**`greeting-service.js`**
```js
const helper = require('./helper');

const greetingService = {
  sayHello: ({ firstName, lastName }) => {
      const fullName = helper.getFullName({ firstName, lastName });

      return `Hello ${fullName}`;
  },
  sayGoodbye: ({ firstName, lastName }) => {
        const fullName = helper.getFullName({ firstName, lastName });

        return `Goodbye, ${fullName}`;
  }
};

module.exports = greetingService;
```


**`index.js`**
```js
const greetingService = require('./greeting-service');

const helloMsg = greetingService.sayHello({firstName: "kenan", lastName: "hancer"});

console.log(helloMsg);

const goodBydMsg = greetingService.sayGoodbye({firstName: "kenan", lastName: "hancer"});

console.log(goodBydMsg);
```



### nut-ioc Syntax

nut-ioc can use your node.js modules automatically. But, you need to export from your module and nut-ioc specific object.
 
**Dependency Basic Syntax**

No need to specify ServiceName and Namespace.

But if you need to call your dependency as a nested object, then use the following notation in `Namespace` field.

**`helper.js`**
```js
module.exports.ServiceName = ""; //fileName if empty,null or undefined
module.exports.Namespace = "business.logic.helpers"; //if empty, then consume helper dependency with name directly
module.exports.Service = ({
    getFullName: ({ firstName, lastName }) => {
        return `${firstName} ${lastName}`;
    }
});
```

now in order to use `helper` dependency in other dependency as below

**`greeting-service.js`**
```js
module.exports.Service = ({ business: { logic: { helper } } }) =>
    ({
        sayHello: ({ firstName, lastName }) => {
            const fullName = helper.getFullName({ firstName, lastName });

            return `Hello ${fullName}`;
        },
        sayGoodbye: ({ firstName, lastName }) => {
            const fullName = helper.getFullName({ firstName, lastName });

            return `Goodbye, ${fullName}`;
        }
    });
```

you can consume helper.js node.js module with helper name. But, if you don't want to update fileName, then you can change serviceName in ServiceName field.

if you want to export any object or function, then use Service field.

**`helper.js`**
```js
module.exports.ServiceName = ""; //fileName if empty,null or undefined
module.exports.Namespace = ""; //if empty, then consume helper dependency with name directly
module.exports.Service = ({
    getFullName: ({ firstName, lastName }) => {
        return `${firstName} ${lastName}`;
    }
});
```


**Dependency Basic Constructor Syntax**

As you can see I didn't use ServiceName and Namespace fields, those fields will have default values.

nut-ioc is injecting dependencies from function always so if you have any dependency, use ```module.exports.Service = ({ helper }) =>``` this syntax then you can use helper dependency in your code, then this constructor function should return an object or function.

one more time, if you have any dependency you should return one function(constructor function) and that constructor function should return an object or direct function.

**`greeting-service.js`**
```js
module.exports.Service = ({ helper }) =>
    ({
        sayHello: ({ firstName, lastName }) => {
            const fullName = helper.getFullName({ firstName, lastName });

            return `Hello ${fullName}`;
        },
        sayGoodbye: ({ firstName, lastName }) => {
            const fullName = helper.getFullName({ firstName, lastName });

            return `Goodbye, ${fullName}`;
        }
    });
```



### nut-ioc loading dependencies with directory path


**`helper.js`**
```js
module.exports.ServiceName = ""; //fileName if empty,null or undefined

module.exports.Service = ({
    getFullName: ({ firstName, lastName }) => {
        return `${firstName} ${lastName}`;
    }
});
```

**`greeting-service.js`**
```js
module.exports.ServiceName = ""; //fileName if empty,null or undefined

module.exports.Service = ({ helper }) =>
    ({
        sayHello: ({ firstName, lastName }) => {
            const fullName = helper.getFullName({ firstName, lastName });

            return `Hello ${fullName}`;
        },
        sayGoodbye: ({ firstName, lastName }) => {
            const fullName = helper.getFullName({ firstName, lastName });

            return `Goodbye, ${fullName}`;
        }
    });
```

if you want to ignore some files or folder in your project, then use ignoredDependencies field in use function as below.

For example, node_modules folder has many folder and files, so you should ignore that folder.

**`index.js`**
```js
const nutIoc = require('nut-ioc');

const nutIocContainer = nutIoc();


const mainAsync = async () => {

    const ignoredDependencies = ['node_modules',
        '.env',
        '*.json',
        '.idea',
        '.git',
        '.gitignore',
        '*.iml',
        '.*',
        '*.md',
        'LICENSE'];

    nutIocContainer.use({ dependencyPath: './', ignoredDependencies });

    const { greetingService } = await nutIocContainer.build();
    



    const helloMsg = greetingService.sayHello({ firstName: "kenan", lastName: "hancer" });

    console.log(helloMsg);

    const goodBydMsg = greetingService.sayGoodbye({ firstName: "kenan", lastName: "hancer" });

    console.log(goodBydMsg);
};

mainAsync();
```

### nut-ioc loading dependencies with programatic dependency definition

you don't have to write your code in JavaScript files, nut-ioc is definition specific framework, so you just provide your dependency definition programmaticaly then nut-ioc will do its job again :)

**`index.js`**
```js
const nutIoc = require('nut-ioc');

const nutIocContainer = nutIoc();


const mainAsync = async () => {

    nutIocContainer.useDependency({
        ServiceName: "authorBasicInfo",
        Service: ({ firstName: "Kenan", lastName: "Hancer" })
    });

    nutIocContainer.useDependency({
        ServiceName: "authorWithContacts",
        Service: ({ authorBasicInfo }) => ({ ...authorBasicInfo, city: "London", mail: "kenanhancer@gmail.com" })
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingHelper",
        Service: ({ }) => ({
            getFullName: ({ firstName, lastName }) => `${firstName} ${lastName}`
        })
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingService",
        Service: ({ greetingHelper: { getFullName } }) => ({
            sayHello: ({ firstName, lastName }) => {

                const fullName = getFullName({ firstName, lastName });

                return `Hello ${fullName}`;
            },
            sayGoodbye: ({ firstName, lastName }) => {
                const fullName = getFullName({ firstName, lastName });

                return `Goodbye, ${fullName}`;
            }
        })
    });

    const { authorWithContacts, greetingService } = await nutIocContainer.build();




    const helloMsg = greetingService.sayHello(authorWithContacts);

    console.log(helloMsg);

    const goodBydMsg = greetingService.sayGoodbye(authorWithContacts);

    console.log(goodBydMsg);
};

mainAsync();
```


### nut-ioc loading dependencies with directory path and programatic dependency definition


**`index.js`**
```js
const nutIoc = require('nut-ioc');

const nutIocContainer = nutIoc();


const mainAsync = async () => {

    const ignoredDependencies = ['node_modules',
        '.env',
        '*.json',
        '.idea',
        '.git',
        '.gitignore',
        '*.iml',
        '.*',
        '*.md',
        'LICENSE'];

    nutIocContainer.use({ dependencyPath: './', ignoredDependencies });

    nutIocContainer.useDependency({
        ServiceName: "authorBasicInfo",
        Service: ({firstName: "Kenan", lastName: "Hancer"})
    });

    nutIocContainer.useDependency({
        ServiceName: "authorWithContacts",
        Service: ({authorBasicInfo}) => ({...authorBasicInfo, city: "London", mail: "kenanhancer@gmail.com"})
    });

    const { greetingService } = await nutIocContainer.build();
    



    const helloMsg = greetingService.sayHello(authorWithContacts);

    console.log(helloMsg);

    const goodBydMsg = greetingService.sayGoodbye(authorWithContacts);

    console.log(goodBydMsg);
};

mainAsync();
```


### nut-ioc loading dependencies with interceptors

I think that this is the most delicious part of code. The benefit of nut-ioc is not only Dependency Injection in run-time, nut-ioc can intercept your function calls. So that you can implement Aspect Oriented Programming, Separation of Concern etc :) 

nut-ioc decreases your development time on any project and provide you many of best programming practices.

**`index.js`**
```js
const nutIoc = require('nut-ioc');

const nutIocContainer = nutIoc();


const mainAsync = async () => {

    nutIocContainer.useDependency({
        IsInterceptor: true,
        ServiceName: "errorInterceptor",
        Namespace: "interceptors",
        Service: ({ }) =>
            (environment, next) => {

                let result;
                try {

                    result = next(environment);

                } catch (error) {

                    appLogger.error(`ERROR: ${`${environment.moduleName}.${environment.method.name}`} method`, error);

                    throw error;
                }

                return result;
            }
    });

    nutIocContainer.useDependency({
        IsInterceptor: true,
        ServiceName: "logInterceptor",
        Namespace: "interceptors",
        Service: ({ }) =>
            (environment, next) => {

                const { method, args } = environment;

                console.log(`ENTRY: ${method.name}(${JSON.stringify(args[0])}) function`)

                const startDate = new Date();

                const result = next(environment);

                const elapsedMilliseconds = new Date() - startDate;

                console.log(`SUCCESS: ${method.name} function returns //${result}: Elapsed milliseconds is ${elapsedMilliseconds}`);

                return result;
            }
    });

    nutIocContainer.useDependency({
        ServiceName: "authorBasicInfo",
        Service: ({ firstName: "Kenan", lastName: "Hancer" })
    });

    nutIocContainer.useDependency({
        ServiceName: "authorWithContacts",
        Service: ({ authorBasicInfo }) => ({ ...authorBasicInfo, city: "London", mail: "kenanhancer@gmail.com" })
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingHelper",
        Service: ({ }) => ({
            getFullName: ({ firstName, lastName }) => `${firstName} ${lastName}`
        }),
        Interceptor: ({ interceptors: { errorInterceptor, logInterceptor } }) => {

            return [errorInterceptor, logInterceptor];
        }
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingService",
        Service: ({ greetingHelper: { getFullName } }) => ({
            sayHello: ({ firstName, lastName }) => {

                const fullName = getFullName({ firstName, lastName });

                return `Hello ${fullName}`;
            },
            sayGoodbye: ({ firstName, lastName }) => {
                const fullName = getFullName({ firstName, lastName });

                return `Goodbye, ${fullName}`;
            }
        }),
        Interceptor: ({ interceptors: { errorInterceptor, logInterceptor } }) => {

            return [errorInterceptor, logInterceptor];
        }
    });

    const { authorWithContacts, greetingService } = await nutIocContainer.build();




    const helloMsg = greetingService.sayHello(authorWithContacts);

    console.log(helloMsg);

    const goodBydMsg = greetingService.sayGoodbye(authorWithContacts);

    console.log(goodBydMsg);
};

mainAsync();
```


## Output of above code

As you can see from output, it should function calls sequentialy with parameters and elapsed milliseconds. This is very simple implementation of nut-ioc, I am sure that you can extend this example better than me :)

```sh
$ node index

ENTRY: sayHello({"firstName":"Kenan","lastName":"Hancer","city":"London","mail":"kenanhancer@gmail.com"}) function
ENTRY: getFullName({"firstName":"Kenan","lastName":"Hancer"}) function
SUCCESS: getFullName function returns //Kenan Hancer: Elapsed milliseconds is 0
SUCCESS: sayHello function returns //Hello Kenan Hancer: Elapsed milliseconds is 0
Hello Kenan Hancer
ENTRY: sayGoodbye({"firstName":"Kenan","lastName":"Hancer","city":"London","mail":"kenanhancer@gmail.com"}) function
ENTRY: getFullName({"firstName":"Kenan","lastName":"Hancer"}) function
SUCCESS: getFullName function returns //Kenan Hancer: Elapsed milliseconds is 0
SUCCESS: sayGoodbye function returns //Goodbye, Kenan Hancer: Elapsed milliseconds is 0
Goodbye, Kenan Hancer
```



### nut-ioc loading and grouping YAML and JSON dependencies

I thought that nut-ioc can do more that above features. So, I added dependency loader functionality, there are three default loaders in nut-ioc (node.js module, JSON, YAML dependency loaders)

In addition to this, if you want to group dependencies under one folder and later consume with folder name, then you need to add __metadata__.js file under folder. nut-ioc will collect all dependencies under swaggerDefinitions variable in run-time. Notice that __metadata__.js content standard nut-ioc dependency definition file, so if you don't want to use folder name as a group variable name then just use Namespace field :)

**`swagger-definitions/__metadata__.js`**
```js
module.exports = {
    Namespace: "",
    ServiceName: "", //fileName if empty,null or undefine
    Service: ({ }) => {
    }
};
```

**`swagger-definitions/greeting-definition-yaml.yaml`**
```yaml
swagger: '2.0'
info:
  description: English Greeting API
  version: 1.0.0
  title: English Greeting API
basePath: /greeting-api/v1
schemes:
  - http
paths:
  /sayHello:
    get:
      summary: Say English Hello Message
      operationId: greetingService.sayHello
      produces:
        - application/json
      parameters:
        - name: firstName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person First Name.
        - name: lastName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person Last Name.
      responses:
        '200':
          description: success
  /sayGoodbye:
    get:
      summary: Say English Goodbye Message
      operationId: greetingService.sayGoodbye
      produces:
        - application/json
      parameters:
        - name: firstName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person First Name.
        - name: lastName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person Last Name.
      responses:
        '200':
          description: success
```

**`swagger-definitions/greeting-definition-json.json`**
```json
{
  "swagger": "2.0",
  "info": {
    "description": "English Greeting API",
    "version": "1.0.0",
    "title": "English Greeting API"
  },
  "basePath": "/greeting-api/v1",
  "schemes": [
    "http"
  ],
  "paths": {
    "/sayHello": {
      "get": {
        "summary": "Say English Hello Message",
        "operationId": "greetingService.sayHello",
        "produces": [
          "application/json"
        ],
        "parameters": [
          {
            "name": "firstName",
            "in": "header",
            "type": "string",
            "maxLength": 100,
            "required": true,
            "description": "Person First Name."
          },
          {
            "name": "lastName",
            "in": "header",
            "type": "string",
            "maxLength": 100,
            "required": true,
            "description": "Person Last Name."
          }
        ],
        "responses": {
          "200": {
            "description": "success"
          }
        }
      }
    },
    "/sayGoodbye": {
      "get": {
        "summary": "Say English Goodbye Message",
        "operationId": "greetingService.sayGoodbye",
        "produces": [
          "application/json"
        ],
        "parameters": [
          {
            "name": "firstName",
            "in": "header",
            "type": "string",
            "maxLength": 100,
            "required": true,
            "description": "Person First Name."
          },
          {
            "name": "lastName",
            "in": "header",
            "type": "string",
            "maxLength": 100,
            "required": true,
            "description": "Person Last Name."
          }
        ],
        "responses": {
          "200": {
            "description": "success"
          }
        }
      }
    }
  }
}
```



**`index.js`**
```js
const nutIoc = require('nut-ioc');

const nutIocContainer = nutIoc();


const mainAsync = async () => {

    nutIocContainer.useDependency({
        IsInterceptor: true,
        ServiceName: "errorInterceptor",
        Namespace: "interceptors",
        Service: ({ }) =>
            (environment, next) => {

                let result;
                try {

                    result = next(environment);

                } catch (error) {

                    appLogger.error(`ERROR: ${`${environment.moduleName}.${environment.method.name}`} method`, error);

                    throw error;
                }

                return result;
            }
    });

    nutIocContainer.useDependency({
        IsInterceptor: true,
        ServiceName: "logInterceptor",
        Namespace: "interceptors",
        Service: ({ }) =>
            (environment, next) => {

                const { method, args } = environment;

                console.log(`ENTRY: ${method.name}(${JSON.stringify(args[0])}) function`)

                const startDate = new Date();

                const result = next(environment);

                const elapsedMilliseconds = new Date() - startDate;

                console.log(`SUCCESS: ${method.name} function returns //${result}: Elapsed milliseconds is ${elapsedMilliseconds}`);

                return result;
            }
    });

    nutIocContainer.useDependency({
        ServiceName: "authorBasicInfo",
        Service: ({ firstName: "Kenan", lastName: "Hancer" })
    });

    nutIocContainer.useDependency({
        ServiceName: "authorWithContacts",
        Service: ({ authorBasicInfo }) => ({ ...authorBasicInfo, city: "London", mail: "kenanhancer@gmail.com" })
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingHelper",
        Service: ({ }) => ({
            getFullName: ({ firstName, lastName }) => `${firstName} ${lastName}`
        }),
        Interceptor: ({ interceptors: { errorInterceptor, logInterceptor } }) => {

            return [errorInterceptor, logInterceptor];
        }
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingService",
        Service: ({ greetingHelper: { getFullName } }) => ({
            sayHello: ({ firstName, lastName }) => {

                const fullName = getFullName({ firstName, lastName });

                return `Hello ${fullName}`;
            },
            sayGoodbye: ({ firstName, lastName }) => {
                const fullName = getFullName({ firstName, lastName });

                return `Goodbye, ${fullName}`;
            }
        }),
        Interceptor: ({ interceptors: { errorInterceptor, logInterceptor } }) => {

            return [errorInterceptor, logInterceptor];
        }
    });

    nutIocContainer.use({ dependencyPath: './swagger-definitions' });

    const { authorWithContacts, greetingService, swaggerDefinitions } = await nutIocContainer.build();




    const helloMsg = greetingService.sayHello(authorWithContacts);

    console.log(helloMsg);

    const goodBydMsg = greetingService.sayGoodbye(authorWithContacts);

    console.log(goodBydMsg);

    console.log();

    console.log('swaggerDefinitions:', swaggerDefinitions);
};

mainAsync();
```

## Output of above code

Notice that swaggerDefinitions is written in output console, greeting-definition-json.json and greeting-definition-yaml.yaml files are converted to JavaScript object in run-time.

```sh
$ node index

ENTRY: sayHello({"firstName":"Kenan","lastName":"Hancer","city":"London","mail":"kenanhancer@gmail.com"}) function
ENTRY: getFullName({"firstName":"Kenan","lastName":"Hancer"}) function
SUCCESS: getFullName function returns //Kenan Hancer: Elapsed milliseconds is 0
SUCCESS: sayHello function returns //Hello Kenan Hancer: Elapsed milliseconds is 0
Hello Kenan Hancer
ENTRY: sayGoodbye({"firstName":"Kenan","lastName":"Hancer","city":"London","mail":"kenanhancer@gmail.com"}) function
ENTRY: getFullName({"firstName":"Kenan","lastName":"Hancer"}) function
SUCCESS: getFullName function returns //Kenan Hancer: Elapsed milliseconds is 0
SUCCESS: sayGoodbye function returns //Goodbye, Kenan Hancer: Elapsed milliseconds is 0
Goodbye, Kenan Hancer

swaggerDefinitions: {
  greetingDefinitionJson: {
    swagger: '2.0',
    info: {
      description: 'English Greeting API',
      version: '1.0.0',
      title: 'English Greeting API'
    },
    basePath: '/greeting-api/v1',
    schemes: [ 'http' ],
    paths: { '/sayHello': [Object], '/sayGoodbye': [Object] }
  },
  greetingDefinitionYaml: {
    swagger: '2.0',
    info: {
      description: 'English Greeting API',
      version: '1.0.0',
      title: 'English Greeting API'
    },
    basePath: '/greeting-api/v1',
    schemes: [ 'http' ],
    paths: { '/sayHello': [Object], '/sayGoodbye': [Object] }
  }
}
```


### nut-ioc loading dependencies with new dependency loaders and filters

I thought that this features will never be enough, as I said before, nut-ioc has YAML, JSON, Node.js module loaders by default, but if you need to load CSV, CSS, JPEG, TXT, XML, HTML, BSON files as a JavaScript object or string, then you can inject new dependency loaders in nut-ioc with useConfiguration or useDependencyLoader functions.

There is also dependency filter functionality in nut-ioc. nut-ioc already has one default dependency filter which filters ignored files. But, if you need more custom filters then use useConfiguration or useDependencyLoader functions.

Shortly, nut-ioc can use your custom dependency loaders and filters in run-time.

**`index.js`**
```js
const nutIoc = require('nut-ioc');

const nutIocContainer = nutIoc();


const mainAsync = async () => {

    nutIocContainer.useDependency({
        IsInterceptor: true,
        ServiceName: "errorInterceptor",
        Namespace: "interceptors",
        Service: ({ }) =>
            (environment, next) => {

                let result;
                try {

                    result = next(environment);

                } catch (error) {

                    appLogger.error(`ERROR: ${`${environment.moduleName}.${environment.method.name}`} method`, error);

                    throw error;
                }

                return result;
            }
    });

    nutIocContainer.useDependency({
        IsInterceptor: true,
        ServiceName: "logInterceptor",
        Namespace: "interceptors",
        Service: ({ }) =>
            (environment, next) => {

                const { method, args } = environment;

                console.log(`ENTRY: ${method.name}(${JSON.stringify(args[0])}) function`)

                const startDate = new Date();

                const result = next(environment);

                const elapsedMilliseconds = new Date() - startDate;

                console.log(`SUCCESS: ${method.name} function returns //${result}: Elapsed milliseconds is ${elapsedMilliseconds}`);

                return result;
            }
    });

    nutIocContainer.useDependency({
        ServiceName: "authorBasicInfo",
        Service: ({ firstName: "Kenan", lastName: "Hancer" })
    });

    nutIocContainer.useDependency({
        ServiceName: "authorWithContacts",
        Service: ({ authorBasicInfo }) => ({ ...authorBasicInfo, city: "London", mail: "kenanhancer@gmail.com" })
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingHelper",
        Service: ({ }) => ({
            getFullName: ({ firstName, lastName }) => `${firstName} ${lastName}`
        }),
        Interceptor: ({ interceptors: { errorInterceptor, logInterceptor } }) => {

            return [errorInterceptor, logInterceptor];
        }
    });

    nutIocContainer.useDependency({
        ServiceName: "greetingService",
        Service: ({ greetingHelper: { getFullName } }) => ({
            sayHello: ({ firstName, lastName }) => {

                const fullName = getFullName({ firstName, lastName });

                return `Hello ${fullName}`;
            },
            sayGoodbye: ({ firstName, lastName }) => {
                const fullName = getFullName({ firstName, lastName });

                return `Goodbye, ${fullName}`;
            }
        }),
        Interceptor: ({ interceptors: { errorInterceptor, logInterceptor } }) => {

            return [errorInterceptor, logInterceptor];
        }
    });

    nutIocContainer.useConfiguration({
        dependencyLoader: ({loaders}) => {
            // console.log(loaders);
        },
        dependencyFilter: ({filters}) => {

            // delete filters['defaultModuleFilter'];
            // console.log(filters);
        }
    });

    nutIocContainer.useDependencyLoader({
        name: 'test-dependency-loader',
        loader: ({filePath, nameProvider}) => {
            // console.log();
        }
    });

    nutIocContainer.useDependencyLoader({
        name: 'test-dependency-loader-2',
        loader: ({filePath, nameProvider}) => {
            // console.log();
        }
    });

    nutIocContainer.useDependencyFilter({
        name: 'test-dependency-filter',
        filter: ({filePath, ignoredDependencies}) => {
            // console.log();

            return true;
        }
    });

    nutIocContainer.useDependencyFilter({
        name: 'test-dependency-filter-2',
        filter: ({filePath, ignoredDependencies}) => {
            // console.log();

            return true;
        }
    });

    nutIocContainer.use({ dependencyPath: './swagger-definitions' });

    const { authorWithContacts, greetingService, swaggerDefinitions } = await nutIocContainer.build();




    const helloMsg = greetingService.sayHello(authorWithContacts);

    console.log(helloMsg);

    const goodBydMsg = greetingService.sayGoodbye(authorWithContacts);

    console.log(goodBydMsg);

    console.log();

    console.log('swaggerDefinitions:', swaggerDefinitions);
};

mainAsync();
```

### nut-ioc dependency hooks

Assume that there is downstream swagger documents, and you need to update host field for every environment like dev, test, prod, etc.

So, after all dependencies are constructed, you need to update **host** field of swagger definition, to do that you can define a hook service,
and update any dependency.

You just need to use **IsHook** feature in nut-ioc services as below **index.js** code.

**`swagger-downstream-definitions/__metadata__.js`**
```js
module.exports = {
    Namespace: "",
    ServiceName: "", //fileName if empty,null or undefine
    Service: ({ }) => {
    }
};
```

**`swagger-downstream-definitions/greeting-english-definition.yaml`**
```yaml
swagger: '2.0'
info:
  description: English Greeting API
  version: 1.0.0
  title: English Greeting API
host: localhost:9090
basePath: /greeting-english-api/v1
schemes:
  - http
paths:
  /sayHello:
    get:
      summary: Say English Hello Message
      operationId: controllers.greetingEnglishService.sayHello
      produces:
        - application/json
      parameters:
        - name: firstName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person First Name.
        - name: lastName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person Last Name.
      responses:
        '200':
          description: success
  /sayGoodbye:
    get:
      summary: Say English Goodbye Message
      operationId: controllers.greetingEnglishService.sayGoodbye
      produces:
        - application/json
      parameters:
        - name: firstName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person First Name.
        - name: lastName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person Last Name.
      responses:
        '200':
          description: success
```

**`swagger-downstream-definitions/greeting-turkish-definition.yaml`**
```yaml
swagger: '2.0'
info:
  description: Turkish Greeting API
  version: 1.0.0
  title: Turkish Greeting API
host: localhost:9090
basePath: /greeting-turkish-api/v1
schemes:
  - http
paths:
  /sayHello:
    get:
      summary: Say Turkish Hello Message
      operationId: controllers.greetingTurkishService.sayHello
      produces:
        - application/json
      parameters:
        - name: firstName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person First Name.
        - name: lastName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person Last Name.
      responses:
        '200':
          description: success
  /sayGoodbye:
    get:
      summary: Say Turkish Goodbye Message
      operationId: controllers.greetingTurkishService.sayGoodbye
      produces:
        - application/json
      parameters:
        - name: firstName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person First Name.
        - name: lastName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person Last Name.
      responses:
        '200':
          description: success
```

**`swagger-downstream-definitions/greeting-helper-definition.yaml`**
```yaml
swagger: '2.0'
info:
  description: Greeting Helper API
  version: 1.0.0
  title: Greeting Helper API
host: localhost:9090
basePath: /greeting-helper-api/v1
schemes:
  - http
paths:
  /getFullName:
    get:
      summary: Get Full Name
      operationId: controllers.greetingHelperService.getFullName
      produces:
        - application/json
      parameters:
        - name: firstName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person First Name.
        - name: lastName
          in: header
          type: string
          maxLength: 100
          required: true
          description: Person Last Name.
      responses:
        '200':
          description: success
```

**`.env`**
```
# Downstream-service(ds) urls
ds.greetingEnglishDefinition.host="localhost:1080"
ds.greetingTurkishDefinition.host="localhost:1080"
ds.greetingHelperDefinition.host="localhost:1080"

# Current-service(cs) urls
cs.greetingDefinition.host="localhost:8080"
cs.greetingDefinitionV2.host="localhost:8080"
```

**`index.js`**
```js
require('dotenv').config();

const nutIoc = require('nut-ioc');

const nutIocContainer = nutIoc();


const mainAsync = async () => {

    nutIocContainer.useDependency({
        ServiceName: "appEnv",
        Namespace: undefined,
        Service: { ...process.env }
    });

    nutIocContainer.use({ dependencyPath: './swagger-downstream-definitions' });

    nutIocContainer.useDependency({
        IsHook: true,
        ServiceName: "swaggerDownstreamDefinitionsUpdateHook",
        Namespace: undefined,
        Service: ({swaggerDownstreamDefinitions, appEnv}) => {

            Object.entries(appEnv).filter(([key, value]) => key.includes('ds.')).forEach(([key, value]) => {
                const [group, serviceName, fieldName] = key.split('.');

                swaggerDownstreamDefinitions[serviceName][fieldName] = value;
            });
        }
    });

};

mainAsync();
```
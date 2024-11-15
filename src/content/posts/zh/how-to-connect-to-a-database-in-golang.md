---
title: 如何在 Golang 中连接数据库
tags:
- programming-language
- golang
- database
date: 2024-11-11 19:05:00
---

本文以 MySQL 和 PostgreSQL 为例，介绍了如何在 Golang 中连接数据库。

<!--more-->

## 准备工作

您需要准备一个 MySQL 和/或一个 PostgreSQL。

如果您安装了 Docker，可以使用以下命令快速创建即用即删的 MySQL 或 PostgreSQL 容器以供测试。我写了一篇[文章](/posts/docker-what-why-how)简单介绍了 Docker，如果您不清楚什么是 Docker，可以看一看。

下面的命令创建一个名为 `mysql-server` 的 MySQL 容器，用户名为 `root`，密码为 `password`，使用 `3306` 端口，并附带一个名为 `example_db` 的数据库：

```bash
docker run --rm --name mysql-server -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=example_db -p 3306:3306 -d mysql
```

下面的命令创建一个名为 `postgres-server` 的 PostgreSQL 容器，用户名为 `postgres`，密码为 `password`，使用 `5432` 端口，并附带一个名为 `example_db` 的数据库：

```bash
docker run --rm --name postgres-server -e POSTGRES_PASSWORD=password -e POSTGRES_DB=example_db -p 5432:5432 -d postgres
```

## 准备环境变量

为了在 Go 中连接数据库，我们需要一些连接信息，这些信息包括：

- 主机名 HOST
- 端口 PORT
- 数据库名 NAME
- 用户名 USER
- 用户密码 PASSWORD

出于安全和可配置等原因，我们不应将这些信息直接写入源代码中。一个推荐的做法是使用环境变量进行管理。我创建了如下环境变量：

- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

如果您使用的是上面所说的以 Docker 方式创建的数据库，这些信息应当如下：

MySQL 版本：

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_NAME=example_db
DB_USER=root
DB_PASSWORD=password
```

PostgreSQL 版本：

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=example_db
DB_USER=postgres
DB_PASSWORD=password
```

## 创建示例项目并连接数据库

创建一个目录 `go-db-example` 并在其中运行下面的命令来创建一个 Go 项目：

```bash
go mod init example/db
```

**可选地**，您可以安装一个 [godotenv](https://github.com/joho/godotenv) 来使程序自动地从项目中的 `.env` 文件中读取环境变量：

```bash
go get github.com/joho/godotenv
```

为了连接数据库，您需要一个 **驱动程序（Driver）**：

- MySQL：[github.com/go-sql-driver/mysql](https://github.com/go-sql-driver/mysql)
- PostgreSQL: [github.com/lib/pq](https://github.com/lib/pq)

运行下面的命令将这些依赖项添加到项目中：

```bash
go get github.com/go-sql-driver/mysql
```

```bash
go get github.com/lib/pq
```

然后这样编辑 `main.go` 来连接数据库：

> [!Caution]
> 注意：下面的代码注释了 Postgres 版本的内容，也注释了使用了 godotenv 的代码

```go
package main

import (
    "database/sql"
    "fmt"
    "os"

    // _ "github.com/joho/godotenv/autoload"
    _ "github.com/go-sql-driver/mysql"
    // _ "github.com/lib/pq"
)

var db *sql.DB

func initDb() {
    // get config from env variables
    dbHost := os.Getenv("DB_HOST")
    dbPort := os.Getenv("DB_PORT")
    dbName := os.Getenv("DB_NAME")
    dbUser := os.Getenv("DB_USER")
    dbPassword := os.Getenv("DB_PASSWORD")

    // construct the connection string
    // mysql
    connStr := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s", dbUser, dbPassword, dbHost, dbPort, dbName)
    // postgres
    // connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", dbHost, dbPort, dbUser, dbPassword, dbName)

    // connect
    var err error
    db, err = sql.Open("mysql", connStr) // mysql
    // db, err = sql.Open("postgres", connStr) // postgres
    if err != nil {
       panic(err)
    }

    // check the connection
    err = db.Ping()
    if err != nil {
       panic(err)
    }
    fmt.Println("Successfully connected to database!")
}

func main() {
    initDb()

    // do something ...

    db.Close()
}
```

测试运行一下：

```bash
go run .
```

如果 `Successfully connected to database!` 成功输出了，那就说明数据库成功连接了。

## 初始化表

下面让我们来创建一张示例表 `users`，表中的数据项定义如下：

```go
type User struct {
    ID       int64
    Email    string
    Password string
}
```

对应的 MySQL 建表语句如下：

```sql
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);
```

对应的 PostgreSQL 建表语句如下：

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);
```

> [!Tip]
> PostgreSQL 中的 SERIAL 对应于 MySQL 中的 INT AUTO_INCREMENT 类型

在 Golang 中，使用 [`Exec()`](https://pkg.go.dev/database/sql#DB.Exec) 来执行这样一条建表语句（如果您使用 PostgreSQL，请自行替换）：

```go
func createUsersTable() {
    query := `
    CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
    )
    `

    _, err := db.Exec(query)
    if err != nil {
        panic(err)
    }
}
```

## 常用操作 CRUD

下面演示四种常用操作，即

- Create
- Read
- Update
- Delete

### Create

让我们来用 INSERT 插入一条记录，相应的语句无论在 MySQL 中还是在 PostgreSQL 中都是一样的：

```sql
INSERT INTO users (email, password)
VALUES ('i@blocklune.cc', 'password123');
```

但是 Go 代码略微有些区别，体现在占位符上：

首先是 MySQL：

```go
func addUser(email, password string) error {
    query := `
    INSERT INTO users (email, password)
    VALUES (?, ?)
    `

    _, err := db.Exec(query, email, password)
    if err != nil {
        return err
    }

    return nil
}
```

接着是 PostgreSQL：

```go
func addUser(email, password string) error {
    query := `
    INSERT INTO users (email, password)
    VALUES ($1, $2)
    `

    _, err := db.Exec(query, email, password)
    if err != nil {
        return err
    }

    return nil
}
```

可以看到 MySQL 中使用 `?` 作为占位符，而 PostgreSQL 中用的是 `$1`, `$2` 等。

> [!Important]
> 从现在开始，下面的代码均 **默认使用 MySQL 语句**，您需要替换占位符以适配 PostgreSQL。

事实上，`Exec()` 的执行结果返回了两个值。我们上面一直只使用了第二个 `error` 类型的值，判断语句执行是否出错。而第一个值的类型为 [`Result`](https://pkg.go.dev/database/sql#Result)，借助它，我们可以获取诸如 “最后插入记录的 ID” 等信息：

```go
result, err := db.Exec(query, email, password)
if err != nil {
    return err
}

userId, err := result.LastInsertId()
if err != nil {
    return err
}
```

> [!Caution]
> 需要注意 PostgreSQL **不支持** 这个 `LastInsertId()`。

如果我们需要执行许多插入操作，我们可以先 “准备” 一下查询语句，以提高性能：

```go
stmt, err := db.Prepare(query)
if err != nil {
    return err
}
defer stmt.Close()

// assumming that there are a lot of records to insert
_, err = stmt.Exec(email, password)
if err != nil {
    return err
}
```

### Read

可以使用 [`Query()`](https://pkg.go.dev/database/sql#DB.Query) 或 [`QueryRow()`](https://pkg.go.dev/database/sql#DB.QueryRow) 来进行查询，区别在于前者返回任意多行，后者返回至多一行：

```go
func getUsers() ([]User, error) {
    query := `
    SELECT id, email, password
    FROM users
    `

    rows, err := db.Query(query)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var user User
        err := rows.Scan(&user.ID, &user.Email, &user.Password)
        if err != nil {
            return nil, err
        }
        users = append(users, user)
    }

    if err = rows.Err(); err != nil {
        return nil, err
    }

    return users, nil
}
```

```go
func getUserByEmail(email string) (*User, error) {
    query := `
    SELECT id, email, password
    FROM users
    WHERE email = ?
    `

    row := db.QueryRow(query, email)

    var user User
    err := row.Scan(&user.ID, &user.Email, &user.Password)
    if err != nil {
        return nil, err
    }

    return &user, nil
}
```

### Update

```go
func updateUserPassword(email, newPassword string) error {
    query := `
    UPDATE users
    SET password = ?
    WHERE email = ?
    `

    _, err := db.Exec(query, newPassword, email)
    if err != nil {
        return err
    }

    return nil
}
```

### Delete

```go
func deleteUserByEmail(email string) error {
    query := `
    DELETE FROM users
    WHERE email = ?
    `

    _, err := db.Exec(query, email)
    if err != nil {
        return err
    }

    return nil
}
```

## 总结

本文详细介绍了如何在 Go 语言中连接和操作数据库，主要内容包括：

1. **环境准备**
   - 使用 Docker 快速搭建 MySQL 和 PostgreSQL 测试环境
   - 配置必要的数据库连接环境变量

2. **数据库连接**
   - 安装必要的数据库驱动
   - 建立数据库连接的基本步骤
   - MySQL 和 PostgreSQL 的连接字符串差异

3. **基础数据库操作（CRUD）**
   - 创建表结构
   - 插入数据（Create）
   - 查询数据（Read）
   - 更新数据（Update）
   - 删除数据（Delete）

4. **实用技巧**
   - 使用环境变量管理配置
   - 预处理语句提高性能
   - MySQL 和 PostgreSQL 的语法差异（如占位符的不同使用方式）

示例仓库：[BlockLune/go-db-example](https://github.com/BlockLune/go-db-example)

## 参考资料

- [Golang MySQL CRUD Example - Golang Docs](https://golangdocs.com/mysql-golang-crud-example)
- [Golang PostgreSQL Example - Golang Docs](https://golangdocs.com/golang-postgresql-example)
- [Tutorial: Accessing a relational database - The Go Programming Language](https://go.dev/doc/tutorial/database-access)
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"

	"github.com/gin-gonic/gin"
)

// UserInfo ...
type UserInfo struct {
	Ruc  string `json:"ruc"`
	Name string `json:"name"`
	City string `json:"city"`
}

// Request ...
type Request struct {
	Dni string `json:"dni"`
}

func main() {
	r := gin.Default()
	r.POST("/", func(c *gin.Context) {
		request := new(Request)
		err := c.BindJSON(request)
		if err != nil {
			panic(err)
		}
		command := exec.Command("node", "main.js", request.Dni)
		data, err := command.Output()
		if err != nil {
			panic(err)
		}
		info := new(UserInfo)
		err = json.Unmarshal(data, info)
		fmt.Println(string(data))
		if err != nil {
			panic(err)
		}

		c.JSON(http.StatusOK, info)

	})
	r.Run(":3500")
}

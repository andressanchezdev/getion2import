package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	h1, _ := bcrypt.GenerateFromPassword([]byte("123456"), bcrypt.DefaultCost)
	h2, _ := bcrypt.GenerateFromPassword([]byte("Password123!"), bcrypt.DefaultCost)
	fmt.Println("Hash for 123456:", string(h1))
	fmt.Println("Hash for Password123!:", string(h2))
}

clonar el repositorio 
```
git clone https://github.com/DomySosof/TC.git
```


# Constuir docker 
```
docker build -t expense-tracker .
```

# correr el contenedor 

```
docker run -p 3020:3020 -v $(pwd)/expenses.db:/app/expenses.db expense-tracker
```

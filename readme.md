# Vefforritun 2, 2025, Hópverkefni

### Admin
"email": "admin@workout.com",
"password": "admin123"

Búa til .env skrá og setja upp db
Sækja pakka og keyra:


```bash
yarn
npx prisma db push
yarn dev
```

Run test:
```bash
yarn test
```

Run lint
```bash
yarn lint
```

### Notes
Hægt er að uploada images í exercises með því að nota id af exercise.
Það er gert með imgix og AWS.
localhost:3000/admin/exercises/0b226c86-91b7-46e1-9546-e9113186a677/image

Einnig var stórt mállíkan (LLM, „gervigreind“, t.d. ChatGTP) notað til að skrifa part af lausn

### Hýsing
Render fyrir web service og neon fyrir postgres

### Hópavinna

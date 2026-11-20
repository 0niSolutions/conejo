# Publicar la web y el panel en Cloudflare

Cómo queda armado:

- **La web** (`/`) son archivos estáticos que Cloudflare sirve directo. Rápido y gratis.
- **El panel** (`/admin/`) está protegido por **Cloudflare Access**: antes de cargar, Cloudflare pide el mail
  y manda un código. Solo entran los mails autorizados. No hay contraseñas que recordar ni que filtrar.
- **Guardar en el panel** = un **commit en GitHub** (`main`), hecho por el Worker (`worker/`).
  Ese commit dispara un build y la web se actualiza sola en 1 o 2 minutos.
- El Worker además verifica por su cuenta el pase de Access y una lista de mails propia: aunque Access
  quedara mal configurado, sin un pase válido no se puede leer ni tocar nada.

Hay que hacer 4 cosas, una sola vez: un token de GitHub, conectar el repo a Cloudflare, configurar
Access y cargar 4 valores en el Worker.

---

## 1. Token de GitHub

Es la llave con la que el Worker guarda los cambios en el repo. Tiene que poder tocar **solo este repo**.

1. GitHub → foto de perfil → **Settings** → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
2. Completá:
   - **Token name:** `conejo-panel`
   - **Resource owner:** `0niSolutions` (si la organización exige aprobar tokens, un admin lo aprueba).
   - **Expiration:** lo más largo que permita. Anotá la fecha: cuando vence, el panel deja de guardar
     y hay que generar otro (paso 4).
   - **Repository access:** *Only select repositories* → `conejo`.
   - **Permissions → Repository permissions → Contents:** *Read and write*. Nada más.
3. **Generate token** y copialo (empieza con `github_pat_`). Se ve una sola vez.

## 2. Conectar el repo a Cloudflare

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** →
   **Import a repository** → elegí `0niSolutions/conejo`.
2. Configuración:
   - **Project name:** `conejo` (tiene que coincidir con `name` en `wrangler.jsonc`).
   - **Build command:** `npm run build`
   - **Deploy command:** `npx wrangler deploy`
   - **Build variables:** `NODE_VERSION` = `22`
3. **Deploy**. Al terminar te da una dirección `conejo.<tu-cuenta>.workers.dev` con la web andando.
   El panel todavía no funciona: falta Access.
4. **Dominio propio** (recomendado): en el Worker → **Settings** → **Domains & Routes** → **Add** →
   **Custom domain**. Si el dominio ya está en Cloudflare, el DNS y el HTTPS se configuran solos.

## 3. Cloudflare Access (el login del panel)

1. En el menú de Cloudflare → **Zero Trust**. La primera vez pide un **team name** (por ejemplo `conejo`)
   y elegir el plan **Free** (hasta 50 usuarios; puede pedir una tarjeta aunque no cobra).
   Tu "team domain" queda `conejo.cloudflareaccess.com`: anotalo.
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
   - **Application name:** `Panel CONEJO`
   - **Session duration:** 24 horas (o lo que prefieras).
   - **Public hostnames**: agregá dos, con tu dominio y estas rutas:
     - dominio: `tudominio.com` · path: `admin`
     - dominio: `tudominio.com` · path: `api/admin`
3. **Policies** → **Add a policy**:
   - **Action:** *Allow*
   - **Include → Emails:** los mails que pueden usar el panel.
4. **Login methods:** dejá **One-time PIN** (el código por mail). Guardá.
5. Abrí la aplicación → **Overview** (o *Basic information*) y copiá el
   **Application Audience (AUD) Tag**: es un texto largo de letras y números.

**La dirección `workers.dev`:** si usás dominio propio, apagala para que haya una sola puerta de entrada:
Worker → **Settings** → **Domains & Routes** → `workers.dev` → **Disable** (y lo mismo con *Preview URLs*).
Igual, aunque quede prendida, el Worker no deja usar la API sin un pase de Access válido.

## 4. Cargar los valores en el Worker

Worker `conejo` → **Settings** → **Variables and Secrets** → **Add**. Cargá los cuatro como tipo
**Secret** (así un deploy nuevo no los borra):

| Nombre | Valor |
|---|---|
| `GITHUB_TOKEN` | el token del paso 1 (`github_pat_...`) |
| `ACCESS_TEAM_DOMAIN` | `conejo.cloudflareaccess.com` (tu team domain del paso 3) |
| `ACCESS_AUD` | el AUD Tag del paso 3 |
| `ADMIN_EMAILS` | los mismos mails de la policy de Access, separados por coma |

`GITHUB_REPO` y `GITHUB_BRANCH` ya están en `wrangler.jsonc`.

## 5. Probar

1. Entrá a `https://tudominio.com/admin/`. Cloudflare pide tu mail → te llega un código → entrás.
2. Cambiá algo chico (por ejemplo, el precio de un producto). Aparece *"Guardaste... La web se actualiza
   en 1 o 2 minutos"*.
3. En GitHub vas a ver un commit **"Panel: actualizar catálogo"**, y en Cloudflare el build corriendo.
4. Cuando termina, el cambio está en la web.

Si algo falla, el panel muestra el motivo (token vencido, falta un valor, mail no autorizado...).
Para más detalle: Worker → **Logs**.

---

## Para tener en cuenta

- **Cada guardado es un commit y un build.** Si hacés varios cambios seguidos rápido (por ejemplo,
  reordenar), el panel los junta en un solo guardado. El plan gratis de Cloudflare alcanza de sobra
  para el uso normal de un catálogo.
- **Si editás código en tu compu, hacé `git pull` antes**: el panel publicado hace commits en `main`.
- **Panel local:** con `npm run dev` el panel sigue andando en `http://localhost:5173/admin/`, sin login
  y solo desde tu compu. Escribe directo en `src/catalog.json`; para publicar esos cambios, commit y push.
- **Sacar a alguien:** borrá su mail de la policy de Access **y** de `ADMIN_EMAILS`.
- **Token vencido o filtrado:** en GitHub revocá el viejo, generá uno nuevo (paso 1) y reemplazá
  `GITHUB_TOKEN` (paso 4). No hace falta volver a publicar.

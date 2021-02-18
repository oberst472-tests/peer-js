<template>
    <div class="page-login">
        <form action="" class="page-login__form" @submit.prevent="login">
            <img alt="" src="@/assets/img/gif.gif">
            <input class="page-login__form-inp" placeholder="Логин" type="text" v-model="form.username">
            <input class="page-login__form-inp" placeholder="Пароль" type="password" v-model="form.password">
            <input class="page-login__form-btn" type="submit" value="Авторизоваться">
        </form>
    </div>
</template>

<script>


export default {
    data() {
        return {
            form: {
                username: 'tablet1',
                password: ''
            }
        }
    },
    methods: {
        async login() {
            const url = `/auth/login/`
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=utf-8'
                },
                body: JSON.stringify(this.form)
            });

            const res = response

            let result = await response.json();

            if (!res.ok || res.status > 300 || result['non_field_errors']?.length) {
                alert(result['non_field_errors'][0])
            }
            else {
                sessionStorage.setItem('tablet_info', JSON.stringify(result))
                this.$router.push({name: 'home'})
            }
        }
    },
    created() {
        const urlPath = sessionStorage.getItem('tablet_info')
        if (urlPath) {
            this.$router.push({name: 'home'})
        }
    },
}
</script>

<style lang="scss" scoped>
.page-login {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;

    .page-login__form {
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: 240px;
        padding: 15px;
        padding-top: 0;
        border: 1px solid #e6e1e1;
        border-radius: 15px;
        overflow: hidden;

        & > * {
            margin-top: 15px;
        }

        img {
            display: block;
            margin-top: 0;
            margin-right: -15px;
            margin-left: -15px;
        }

        &-title {
            display: block;
            text-align: center;
        }

        &-inp {
            padding: 15px;
            border: 1px solid #e6e1e1;
            border-radius: 5px;
            outline: none;
        }

        &-btn {
            padding: 15px;
            color: #fff;
            border: none;
            border-radius: 5px;
            outline: none;
            background-color: #33e9df;
            cursor: pointer;

            &:active {
                opacity: 0.7;
            }
        }
    }

    .page-login__form-inp {
        padding: 15px;
        border: 1px solid #e6e1e1;
        outline: none;
    }
}
</style>


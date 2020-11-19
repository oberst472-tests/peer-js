<template>
    <div class="ui-circle-btn" @click="$emit('click')" :class="`ui-circle-btn--${theme}`">
        <slot/>
    </div>
</template>

<script>
export default {
    props: {
        theme: {
            type: String,
            default: 'positive'
        },
    },
}
</script>

<style scoped lang="scss">
    .ui-circle-btn {
        border-radius: 50%;
        font-size: 0;
        background-repeat: no-repeat;
        background-position: center;
        cursor: pointer;
        transition-duration: 0.3s;
        background-size: 60px;
        &:active {
            opacity: 0.5;
        }

        &--active {
            pointer-events: none;
            background-color: darkgray;
        }
        &--positive {
            background-color: $color--positive;
            background-image: url('./phone-call.svg');
            background-size: 40px;
            &:hover {
                background-color: darken($color--positive, 20%);
            }
        }
        &--negative {
            background-color: $color--negative;
            background-image: url('./phone-call-end.svg');
            background-size: 50px;
            &:hover {
                background-color: darken($color--negative, 20%);
            }
        }

    }
</style>

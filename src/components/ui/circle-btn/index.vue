<template>
    <div class="ui-circle-btn">
        <slot/>
    </div>
</template>

<script>
export default {}
</script>

<style scoped lang="scss">
    .ui-circle-btn {
        background-color: $color--positive;
        border-radius: 50%;
        font-size: 0;
        background-image: url('./phone-call.svg');
        background-size: 60%;
        background-repeat: no-repeat;
        background-position: center;
        cursor: pointer;
        transition-duration: 0.3s;
        &:hover {
            background-color: darken($color--positive, 20%);
        }
        &:active {
            opacity: 0.5;
        }

        &--active {
            pointer-events: none;
            background-color: darkgray;
        }

    }
</style>

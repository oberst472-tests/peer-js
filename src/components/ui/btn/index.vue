<template>
    <div :class="btnClasses" class="ui-btn">
        <component
            :class="btnItemClasses"
            :href="href"
            :is="tag"
            :target="href ? '_blank' : ''"
            :to="to"
            @click="click"
            class="ui-btn__item"
        >
            <span class="ui-btn__item-loading" v-if="loading"><span></span></span>
            <span class="ui-btn__item-value">
                <component class="ui-btn__item-icon" v-if="icon" :is="icon"/>
                <slot/>
            </span>
        </component>
    </div>
</template>

<script>
    export default {
        props: {
            theme: {
                type: String,
                default: 'primary'
            },
            size: {
                type: String,
                default: 'medium'
            },
            disabled: {
                type: Boolean,
                default: false
            },
            loading: {
                type: Boolean,
                default: false
            },
            href: {
                type: String,
                default: ''
            },
            to: {
                type: Object,
                default: null
            },
            icon: {
                type: String,
                default: ''
            },
            border: {
                type: Boolean,
                default: false
            },
        },
        data() {
            return {
            }
        },
        computed: {
            btnItemClasses() {
                return {
                    'ui-btn__item--disabled': this.disabled,
                    'ui-btn__item--loading': this.loading,
                    [`ui-btn__item--theme-${this.theme}`]: true,
                    [`ui-btn__item--border`]: this.border,
                    [`ui-btn--styles`]: this.styles
                }
            },
            btnClasses() {
                return {
                    [`ui-btn--size-${this.size}`]: true
                }
            },
            tag() {
                if (this.href) {
                    return 'a'
                } else if (this.to) {
                    return 'router-link'
                } else {
                    return 'button'
                }
            }
        },
        methods: {
            click() {
               this.$emit('click')
            },
        }
    }
</script>

<style scoped lang="scss">
    .ui-btn {
        font-family: $family--default;
        position: relative;
        z-index: 2;
        display: inline-flex;

        &__item {
            position: relative;
            box-sizing: border-box;
            display: inline-flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            font-size: 12px;
            line-height: 1;
            border: 0;
            border-radius: 8px;
            outline: none;
            cursor: pointer;
            user-select: none;
            transition: background-color 0.3s ease, box-shadow 0.3s ease;
            text-decoration: none;
            -webkit-tap-highlight-color: transparent;

            &-value {
                white-space: nowrap;
                letter-spacing: 0.03em;
                width: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: $font-weight--medium;
            }
            &-icon {
                margin-right: 10px;
                width: 18px;
                height: 18px;
            }

            &--theme {
                &-primary {
                    color: #ffffff;
                    background-color: $color--primary;

                    &:hover {
                        background-color: darken($color--primary, 15%);
                    }
                    &:active {
                        transition-duration: 0s;
                        background-color: lighten($color--primary, 20%);
                    }
                    &.ui-btn__item--border {
                        background-color: transparent;
                        box-shadow: 0 0 0 1px $color--primary inset;
                        color: $color--primary;
                        &:hover {
                            box-shadow: 0 0 0 1px rgba(118, 91, 234, 0.4) inset;
                        }
                        &:active {
                            transition-duration: 0s;
                            color: $color--text-invert;
                            background-color: #6147D8;
                            box-shadow: 0 0 0 1px #6147D8;
                        }

                    }
                }

                &-positive {
                    color: #ffffff;
                    background-color: $color--positive;

                    &:hover {
                        background-color: #69C6B3;
                    }
                    &:active {
                        transition-duration: 0s;
                        background-color: #55B2A1;
                    }
                }

                &-negative {
                    color: #ffffff;
                    background-color: $color--negative;

                    &:hover {
                        background-color: #F48094;
                    }
                    &:active {
                        transition-duration: 0s;
                        background-color: #DF6C82;
                    }
                }

            }

            &--disabled {
                background-color: #F4F4F4;
                color: #8E959C;
                pointer-events: none;
            }

            &--loading {
                /*opacity: 0.7;*/
                pointer-events: none;

                .ui-btn__item-value {
                    opacity: 0;
                }
            }

            &__value {
                pointer-events: none;
            }

            &-loading {
                display: inline-flex;
                justify-content: center;
                align-items: center;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);

                span {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border: 1px solid transparent;
                    border-top-color: currentColor;
                    border-bottom-color: currentColor;
                    border-radius: 50%;
                    animation: spin 1.5s linear infinite;
                    pointer-events: none;

                    &:before {
                        width: 2px;
                        height: 2px;
                        border-color: #ffffff;
                        content: '';
                        display: block;
                        border-radius: 50%;
                        animation: pulse 1s alternate ease-in-out infinite;
                    }
                }
            }

        }
        &--styles {
            transition-duration: 0.3s;
            &:hover {
                opacity: 0.8 !important;
            }
            &:active {
                opacity: 0.6 !important;
            }
        }


        &--size {
            &-medium {
                width: auto;
                min-width: 75px;
                min-height: 33px;

                .ui-btn__item {
                    padding: 5px 12px;
                }

                .ui-btn__item-loading {
                    span {
                        width: 20px;
                        height: 20px;
                        border-width: 1px;

                        &:before {
                            width: 4px;
                            height: 4px;
                            border: 1px solid currentColor;
                        }
                    }
                }
            }
        }

    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes pulse {
        from {
            transform: scale(0.5);
        }
        to {
            transform: scale(1);
        }
    }

    .fade-enter-active, .fade-leave-active {
        transition: opacity 0.3s;
    }

    .fade-enter, .fade-leave-to {
        opacity: 0;
    }
</style>

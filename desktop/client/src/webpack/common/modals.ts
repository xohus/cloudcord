/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as t from "@vencord/discord-types";
import { filters, findByCodeLazy, findComponentByCodeLazy, findExportedComponentLazy, mapMangledModuleLazy } from "@webpack";

// Discord no longer exports this under the name "Modal"; it is the only component
// with an action-bar input layout, so match it by code.
export const Modal: t.Modal = findComponentByCodeLazy("actionBarInputLayout");
export const ConfirmModal: t.ConfirmModal = findExportedComponentLazy("ConfirmModal");

// Modal key: "Media Viewer Modal"
export const openMediaModal: (props: t.MediaModalProps) => void = findByCodeLazy("hasMediaOptions", "shouldHideMediaOptions");

const ModalAPI: t.ModalAPI = mapMangledModuleLazy(".modalKey?", {
    openModalLazy: filters.byCode(".modalKey?"),
    openModal: filters.byCode(",instant:"),
    closeModal: filters.byCode(".onCloseCallback()"),
    closeAllModals: filters.byCode(".getState();for")
});

export const { openModalLazy, openModal, closeModal, closeAllModals } = ModalAPI;
